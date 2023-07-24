package loader

import (
	"database/sql"
	"fmt"
	"loader/libs/schema"
	"loader/pkg/config"
	"strings"

	pq "github.com/lib/pq"
	"github.com/samber/lo"

	log "github.com/sirupsen/logrus"
)

// UTILS
func formatVariable(a interface{}) string {
	switch v := a.(type) {
	case string:
		return fmt.Sprintf("'%v'", v)
	case nil:
		return "NULL"
	default:
		return fmt.Sprintf("%v", v)
	}
}

//

var (
	ProgresTypeMap = map[schema.DataType]string{
		schema.String:   "text",
		schema.Number:   "decimal",
		schema.DateTime: "timestamptz",
		schema.Boolean:  "boolean",
		schema.Array:    "text[]",
		schema.Unknown:  "text",
	}
)

type PostgreLoader struct {
	DatasourceId string
	SyncVersion  int
	conn         *sql.DB

	tableName string
}

func (l *PostgreLoader) Setup() error {
	log.Debug("Setting up postgres loader")

	connStr := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		config.AppConfig.DbHost,
		config.AppConfig.DbPort,
		config.AppConfig.DbUser,
		config.AppConfig.DbPassword,
		config.AppConfig.DbName,
		config.AppConfig.DbSslMode,
	)
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Error("Error when connecting to postgres: ", err)
		return err
	}
	l.conn = db

	l.tableName = fmt.Sprintf("_%s", l.DatasourceId)

	return nil
}

func (l *PostgreLoader) Close() error {
	if l.conn != nil {
		err := l.conn.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func (l *PostgreLoader) Load(data *LoaderData) error {
	log.Info("Loading data to postgres")

	txn, err := l.conn.Begin()
	if err != nil {
		return err
	}
	defer txn.Rollback()

	l.setTimezone(txn)

	if l.SyncVersion == 1 {
		err = l.initTable(txn, data)
		if err != nil {
			return err
		}
		err = l.loadAddedRows(txn, data)
		if err != nil {
			return err
		}
	} else {
		err = l.loadSchemaChange(txn, data)
		if err != nil {
			return err
		}
		err = l.loadRemovedRows(txn, data)
		if err != nil {
			return err
		}
		err = l.loadAddedRows(txn, data)
		if err != nil {
			return err
		}
		err = l.loadUpdateFields(txn, data)
		if err != nil {
			return err
		}
		err = l.loadAddedFields(txn, data)
		if err != nil {
			return err
		}
		err = l.loadDeletedFields(txn, data)
		if err != nil {
			return err
		}
	}

	err = txn.Commit()
	if err != nil {
		txn.Rollback()
		return err
	}

	return nil
}

func (l *PostgreLoader) setTimezone(txn *sql.Tx) error {
	query := fmt.Sprintf("SET TIMEZONE = 'UTC'")
	_, err := txn.Exec(query)
	if err != nil {
		return err
	}

	return nil
}

func (l *PostgreLoader) initTable(txn *sql.Tx, data *LoaderData) error {
	log.Info("Initilizing table")

	fields := strings.Join(lo.Map(data.AddedRows.Fields, func(fieldName string, _ int) string {
		schemaField := data.Schema[fieldName]
		result := fmt.Sprintf("%s %s", fieldName, ProgresTypeMap[schemaField.Type])
		if schemaField.Primary {
			result += " PRIMARY KEY"
		}
		return result
	}), ",")
	query := fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s (%s)", l.tableName, fields)
	log.Debug("Query: ", query)
	_, err := txn.Exec(query)
	if err != nil {
		return err
	}

	log.Info("Initialized table to postgres")

	return nil
}

func (l *PostgreLoader) loadSchemaChange(txn *sql.Tx, data *LoaderData) error {
	log.Info("Loading schema changes")

	// deleted fields
	if len(data.SchemaChanges.DeletedFields) > 0 {
		log.Info("Deleting fields")
		dropColumns := strings.Join(lo.Map(data.SchemaChanges.DeletedFields, func(field string, _ int) string {
			return fmt.Sprintf("DROP COLUMN %s", field)
		}), ",")
		query := fmt.Sprintf("ALTER TABLE %s %s", l.tableName, dropColumns)
		log.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			log.Error("Error when deleting fields: ", err)
			return err
		}
	}

	// added fields
	if len(data.SchemaChanges.AddedFields) > 0 {
		log.Info("Adding fields")
		addColumns := make([]string, 0, len(data.SchemaChanges.AddedFields))
		for fieldName, field := range data.SchemaChanges.AddedFields {
			addColumns = append(addColumns, fmt.Sprintf("ADD COLUMN %s %s", fieldName, ProgresTypeMap[field.Type]))
		}
		query := fmt.Sprintf("ALTER TABLE %s %s", l.tableName, strings.Join(addColumns, ","))
		log.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			log.Error("Error when adding fields: ", err)
			return err
		}
	}

	// updated type fields
	if len(data.SchemaChanges.UpdatedTypeFields) > 0 {
		log.Info("Updating type fields")
		updatedTypeFields := lo.Keys(data.SchemaChanges.UpdatedTypeFields)

		// TODO: delete columns first then add columns with null values
		dropColumns := strings.Join(lo.Map(updatedTypeFields, func(field string, _ int) string {
			return fmt.Sprintf("DROP COLUMN %s", field)
		}), ",")
		query := fmt.Sprintf("ALTER TABLE %s %s", l.tableName, dropColumns)
		log.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			log.Error("Error when updating type fields (drop column): ", err)
			return err
		}

		addColumns := strings.Join(lo.Map(updatedTypeFields, func(field string, _ int) string {
			return fmt.Sprintf("ADD COLUMN %s %s", field, ProgresTypeMap[data.SchemaChanges.UpdatedTypeFields[field]])
		}), ",")
		query = fmt.Sprintf("ALTER TABLE %s %s", l.tableName, addColumns)
		log.Debug("Query: ", query)
		_, err = txn.Exec(query)
		if err != nil {
			log.Error("Error when updating type fields (add column): ", err)
			return err
		}
	}

	log.Info("Loaded schema changes")

	return nil
}

func (l *PostgreLoader) loadAddedRows(txn *sql.Tx, data *LoaderData) error {
	log.Info("Loading added rows to postgres")

	if len(data.AddedRows.Rows) == 0 {
		log.Info("No added rows to load")
		return nil
	}

	log.Debug("Inserting data")
	query := pq.CopyIn(l.tableName, data.AddedRows.Fields...)
	log.Debug("Query: ", query)
	stmt, err := txn.Prepare(query)
	if err != nil {
		log.Debug("Error when preparing statement: ", err)
		return err
	}
	defer stmt.Close()
	for _, row := range data.AddedRows.Rows {
		_, err = stmt.Exec(row...)
		if err != nil {
			log.Debug("Error when inserting data: ", err)
			return err
		}
	}
	_, err = stmt.Exec()
	if err != nil {
		return err
	}
	err = stmt.Close()
	if err != nil {
		return err
	}

	log.Info("Loaded added rows to postgres")

	return nil
}

func (l *PostgreLoader) loadRemovedRows(txn *sql.Tx, data *LoaderData) error {
	log.Info("Loading removed rows to postgres")

	if len(data.DeletedRows) == 0 {
		log.Info("No removed rows to load")
		return nil
	}

	for _, id := range data.DeletedRows {
		query := fmt.Sprintf("DELETE FROM %s WHERE %s = '%s'", l.tableName, data.PrimaryField, id)
		log.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			return err
		}
	}

	log.Info("Loaded removed rows to postgres")

	return nil
}

func (l *PostgreLoader) loadUpdateFields(txn *sql.Tx, data *LoaderData) error {
	log.Info("Loading updated fields rows")

	if len(data.UpdatedFields) == 0 {
		log.Info("No updated fields rows to load")
		return nil
	}

	for rowId, fieldUpdateData := range data.UpdatedFields {
		updatedFields := lo.Keys(fieldUpdateData)
		setUpdatedFields := strings.Join(lo.Map(updatedFields, func(fieldName string, _ int) string {
			return fmt.Sprintf("%s = %s", fieldName, formatVariable(fieldUpdateData[fieldName]))
		}), ", ")
		query := fmt.Sprintf("UPDATE %s SET %s WHERE %s = '%s'", l.tableName, setUpdatedFields, data.PrimaryField, rowId)
		log.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			return err
		}
	}

	log.Info("Loaded updated fields")

	return nil
}

func (l *PostgreLoader) loadAddedFields(txn *sql.Tx, data *LoaderData) error {
	log.Info("Loading added fields rows")

	if len(data.AddedFields) == 0 {
		log.Info("No added fields rows to load")
		return nil
	}

	for rowId, fieldAddData := range data.AddedFields {
		addedFields := lo.Keys(fieldAddData)
		setAddedFields := strings.Join(lo.Map(addedFields, func(fieldName string, _ int) string {
			return fmt.Sprintf("%s = %s", fieldName, formatVariable(fieldAddData[fieldName]))
		}), ", ")
		query := fmt.Sprintf("UPDATE %s SET %s WHERE %s = '%s'", l.tableName, setAddedFields, data.PrimaryField, rowId)
		log.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			return err
		}
	}

	log.Info("Loaded updated fields to postgres")

	return nil
}

func (l *PostgreLoader) loadDeletedFields(txn *sql.Tx, data *LoaderData) error {
	log.Info("Loading deleted fields rows")

	if len(data.DeletedFields) == 0 {
		log.Info("No deleted fields rows to load")
		return nil
	}

	for rowId, fieldsToDelete := range data.DeletedFields {
		setDeletedFields := strings.Join(lo.Map(fieldsToDelete, func(fieldName string, _ int) string {
			return fmt.Sprintf("%s = NULL", fieldName)
		}), ", ")
		query := fmt.Sprintf("UPDATE %s SET %s WHERE %s = '%s'", l.tableName, setDeletedFields, data.PrimaryField, rowId)
		log.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			return err
		}
	}

	log.Info("Loaded deleted fields to postgres")

	return nil
}
