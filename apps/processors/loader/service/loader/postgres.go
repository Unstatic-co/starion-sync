package loader

import (
	"context"
	"database/sql"
	"fmt"
	"loader/libs/schema"
	"loader/pkg/config"
	name "loader/service/loader/namespace/postgres"
	"strings"
	"sync"

	jsoniter "github.com/json-iterator/go"
	pq "github.com/lib/pq"
	"github.com/samber/lo"

	log "github.com/sirupsen/logrus"
)

// const

var (
	dataTableColumns = map[name.TableColumn]string{
		name.IdColumn:            "text PRIMARY KEY NOT NULL",
		name.TableDataDataColumn: "jsonb",
		name.MetadataColumn:      "jsonb",
		name.CreatedAtColumn:     "timestamptz DEFAULT NOW() NOT NULL",
		name.UpdatedAtColumn:     "timestamptz DEFAULT NOW() NOT NULL",
	}
	schemaTableColumns = map[name.TableColumn]string{
		name.IdColumn:           "serial PRIMARY KEY NOT NULL",
		name.DataSourceIdColumn: "text",
		name.MetadataColumn:     "jsonb",
		name.CreatedAtColumn:    "timestamptz DEFAULT NOW() NOT NULL",
		name.UpdatedAtColumn:    "timestamptz DEFAULT NOW() NOT NULL",
	}
	schemaFieldTableColumns = map[name.TableColumn]string{
		name.IdColumn: "serial PRIMARY KEY NOT NULL",
		name.SchemaIdColumn: fmt.Sprintf(
			"serial NOT NULL REFERENCES %s (%s) ON DELETE CASCADE",
			name.SchemaTable,
			name.IdColumn,
		),
		name.HashedNameColumn:   "text NOT NULL",
		name.NameColumn:         "text NOT NULL",
		name.TypeColumn:         "text NOT NULL",
		name.OriginalTypeColumn: "text NOT NULL",
		name.NullableColumn:     "boolean DEFAULT true NOT NULL",
		name.EnumColumn:         "jsonb",
		name.ReadonlyColumn:     "boolean DEFAULT false NOT NULL",
		name.IsPrimaryColumn:    "boolean DEFAULT false NOT NULL",
		name.MetadataColumn:     "jsonb",
		name.CreatedAtColumn:    "timestamptz DEFAULT NOW() NOT NULL",
		name.UpdatedAtColumn:    "timestamptz DEFAULT NOW() NOT NULL",
	}
)

// DB Connection

var lockCreatePostgresDbConn = &sync.Mutex{}
var postgresDbConn *sql.DB

func getPostgresDbConnection() (*sql.DB, error) {
	if postgresDbConn == nil {
		lockCreatePostgresDbConn.Lock()
		defer lockCreatePostgresDbConn.Unlock()
		if postgresDbConn == nil {
			connStr := config.AppConfig.DbUri
			if connStr == "" {
				connStr = fmt.Sprintf(
					"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
					config.AppConfig.DbHost,
					config.AppConfig.DbPort,
					config.AppConfig.DbUser,
					config.AppConfig.DbPassword,
					config.AppConfig.DbName,
					config.AppConfig.DbSslMode,
				)
			}
			db, err := sql.Open("postgres", connStr)
			if err != nil {
				log.Error("Error when connecting to postgres: ", err)
				return nil, err
			}
			postgresDbConn = db
		}
	}
	log.Info("Connected to postgres")
	return postgresDbConn, nil
}

func setupPostgresDbLoader() error {
	log.Info("Setting up postgres loader")

	dbConn, err := getPostgresDbConnection()
	if err != nil {
		log.Error("Error when getting db connection: ", err)
		return err
	}

	// create schema tables
	log.Info("Initilizing schema tables")
	columns := make([]string, 0, len(schemaTableColumns))
	for colName, colType := range schemaTableColumns {
		columns = append(columns, fmt.Sprintf("%s %s", colName, colType))
	}
	query := fmt.Sprintf(
		`CREATE TABLE IF NOT EXISTS %s (%s);
		CREATE INDEX IF NOT EXISTS idx_data_source_id ON schema (data_source_id)`,
		name.SchemaTable,
		strings.Join(columns, ","),
	)
	log.Debug("Query: ", query)
	_, err = dbConn.Exec(query)
	if err != nil {
		return err
	}

	// create schema field tables
	columns = make([]string, 0, len(schemaFieldTableColumns))
	for colName, colType := range schemaFieldTableColumns {
		columns = append(columns, fmt.Sprintf("%s %s", colName, colType))
	}
	query = fmt.Sprintf(
		`CREATE TABLE IF NOT EXISTS %s (%s)`,
		name.SchemaFieldTable,
		strings.Join(columns, ","),
	)
	log.Debug("Query: ", query)
	_, err = dbConn.Exec(query)
	if err != nil {
		return err
	}

	log.Info("Initialized schema tables")

	log.Info("Initialized postgres")

	return nil
}

// UTILS
func formatVariableToPostgresStatementValue(a interface{}) string {
	switch v := a.(type) {
	case string:
		return fmt.Sprintf("\"%v\"", v)
	case nil:
		return "null"
	default:
		return fmt.Sprintf("%v", v)
	}
}

type PostgreLoader struct {
	DatasourceId string
	SyncVersion  uint
	PrevVersion  uint

	tableName string

	dbConn *sql.DB
}

func (l *PostgreLoader) Setup() error {
	log.Debug("Setting up postgres loader")

	dbConn, err := getPostgresDbConnection()
	if err != nil {
		log.Error("Error when getting db connection: ", err)
		return err
	}
	l.dbConn = dbConn

	if (l.tableName == "") || (l.tableName == "null") {
		l.tableName = fmt.Sprintf("_%s", l.DatasourceId)
	}

	return nil
}

func (l *PostgreLoader) Close() error {
	return nil
}

func (l *PostgreLoader) Load(ctx context.Context, data *LoaderData) error {
	log.Info("Loading data to postgres")
	txn, err := l.dbConn.BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelReadCommitted,
	})
	if err != nil {
		return err
	}
	defer txn.Rollback()

	l.setTimezone(txn)

	if l.PrevVersion == 0 {
		err := l.loadSchema(txn, data)
		if err != nil {
			return err
		}
		err = l.initTable(txn, data)
		if err != nil {
			return err
		}
		err = l.loadAddedRows(txn, data)
		if err != nil {
			return err
		}
	} else {
		err := l.loadSchemaChange(txn, data)
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

	fields := make([]string, 0, len(dataTableColumns))
	for fieldName, fieldType := range dataTableColumns {
		fields = append(fields, fmt.Sprintf("%s %s", fieldName, fieldType))
	}
	query := fmt.Sprintf("CREATE TABLE IF NOT EXISTS \"%s\" (%s)", l.tableName, strings.Join(fields, ","))
	log.Debug("Query: ", query)
	_, err := txn.Exec(query)
	if err != nil {
		return err
	}

	log.Info("Initialized table to postgres")

	return nil
}

func (l *PostgreLoader) loadSchema(txn *sql.Tx, data *LoaderData) error {
	log.Info("Loading schema")

	// get schema id if exists
	var schemaId int
	query := fmt.Sprintf(`SELECT id FROM %s WHERE %s = $1`, name.SchemaTable, name.DataSourceIdColumn)
	log.Debug("Query: ", query)
	err := txn.QueryRow(query, l.DatasourceId).Scan(&schemaId)
	if err != nil {
		if err == sql.ErrNoRows {
			// create schema
			log.Info("Creating schema")
			query = fmt.Sprintf("INSERT INTO %s (%s) VALUES ($1) RETURNING id", name.SchemaTable, name.DataSourceIdColumn)
			log.Debug("Query: ", query)
			err = txn.QueryRow(query, l.DatasourceId).Scan(&schemaId)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}

	// create schema fields
	log.Info("Creating schema fields")
	query = pq.CopyIn(
		name.SchemaFieldTable,
		name.HashedNameColumn,
		name.SchemaIdColumn,
		name.NameColumn,
		name.TypeColumn,
		name.OriginalTypeColumn,
		name.NullableColumn,
		name.EnumColumn,
		name.ReadonlyColumn,
		name.IsPrimaryColumn,
	)
	log.Debug("Query: ", query)
	stmt, err := txn.Prepare(query)
	if err != nil {
		log.Debug("Error when preparing statement: ", err)
		return err
	}
	defer stmt.Close()
	for fieldId, field := range data.Schema {
		enum, err := jsoniter.MarshalToString(field.Enum)
		if err != nil {
			log.Error("Error when marshaling enum: ", err)
			return err
		}
		_, err = stmt.Exec(fieldId, schemaId, field.Name, field.Type, field.OriginalType, field.Nullable, enum, field.Readonly, field.Primary)
		if err != nil {
			log.Debug("Error when inserting field: ", err)
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

	log.Info("Loaded schema")

	return nil
}

func (l *PostgreLoader) loadSchemaChange(txn *sql.Tx, data *LoaderData) error {
	log.Info("Loading schema changes")

	// get schema id
	var schemaId int
	query := fmt.Sprintf("SELECT id FROM %s WHERE %s = $1", name.SchemaTable, name.DataSourceIdColumn)
	log.Debug("Query: ", query)
	err := txn.QueryRow(query, l.DatasourceId).Scan(&schemaId)
	if err != nil {
		return err
	}

	// deleted fields
	if len(data.SchemaChanges.DeletedFields) > 0 {
		log.Info("Deleting fields")
		// delete from schema fields
		query = fmt.Sprintf(
			"DELETE FROM %s WHERE %s = %d AND %s IN ('%s')",
			name.SchemaFieldTable,
			name.SchemaIdColumn,
			schemaId,
			name.HashedNameColumn,
			strings.Join(data.SchemaChanges.DeletedFields, "','"),
		)
		log.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			log.Error("Error when deleting fields: ", err)
			return err
		}
		// delete from table data
		query = fmt.Sprintf(
			"UPDATE \"%s\" SET %s = %s - ARRAY[%s]",
			l.tableName,
			name.TableDataDataColumn,
			name.TableDataDataColumn,
			strings.Join(
				lo.Map(data.SchemaChanges.DeletedFields, func(field string, _ int) string {
					return fmt.Sprintf("'%s'", field)
				}),
				","),
		)
		log.Debug("Query: ", query)
		_, err = txn.Exec(query)
		if err != nil {
			log.Error("Error when deleting fields from table data: ", err)
			return err
		}
	}

	// added fields
	if len(data.SchemaChanges.AddedFields) > 0 {
		log.Info("Adding schema fields")
		query = pq.CopyIn(
			name.SchemaFieldTable,
			name.HashedNameColumn,
			name.SchemaIdColumn,
			name.NameColumn,
			name.TypeColumn,
			name.OriginalTypeColumn,
			name.NullableColumn,
			name.EnumColumn,
			name.ReadonlyColumn,
			name.IsPrimaryColumn,
		)
		log.Debug("Query: ", query)
		stmt, err := txn.Prepare(query)
		if err != nil {
			log.Debug("Error when preparing statement: ", err)
			return err
		}
		defer stmt.Close()
		for fieldId, field := range data.SchemaChanges.AddedFields {
			enum, err := jsoniter.MarshalToString(field.Enum)
			if err != nil {
				log.Error("Error when marshaling enum: ", err)
				return err
			}
			_, err = stmt.Exec(fieldId, schemaId, field.Name, field.Type, field.OriginalType, field.Nullable, enum, field.Readonly, field.Primary)
			if err != nil {
				log.Debug("Error when inserting field: ", err)
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
	}

	// updated fields
	if len(data.SchemaChanges.UpdatedFields) > 0 {
		log.Info("Updating fields")

		for fieldId, field := range data.SchemaChanges.UpdatedFields {
			enum, err := jsoniter.MarshalToString(field.Enum)
			if err != nil {
				log.Error("Error when marshaling enum: ", err)
				return err
			}
			query := fmt.Sprintf(
				"UPDATE %s SET %s = '%s', %s = '%s', %s = '%s', %s = %t, %s = '%s', %s = %t, %s = %t, %s = %s WHERE %s = %d AND %s = '%s'",
				name.SchemaFieldTable,
				name.NameColumn, field.Name,
				name.TypeColumn, field.Type,
				name.OriginalTypeColumn, field.OriginalType,
				name.NullableColumn, field.Nullable,
				name.EnumColumn, enum,
				name.ReadonlyColumn, field.Readonly,
				name.IsPrimaryColumn, field.Primary,
				name.UpdatedAtColumn, "NOW()",
				name.SchemaIdColumn, schemaId,
				name.HashedNameColumn, fieldId,
			)
			log.Debug("Query: ", query)
			_, err = txn.Exec(query)
			if err != nil {
				log.Error("Error when updating fields: ", err)
				return err
			}
		}
	}

	log.Info("Loaded schema changes")

	return nil
}

func (l *PostgreLoader) loadAddedRows(txn *sql.Tx, data *LoaderData) error {
	log.Info("Loading added rows to postgres, count: ", len(data.AddedRows.Rows))

	if len(data.AddedRows.Rows) == 0 {
		log.Info("No added rows to load")
		return nil
	}

	log.Debug("Inserting data")
	query := pq.CopyIn(l.tableName, string(name.IdColumn), string(name.TableDataDataColumn))
	log.Debug("Query: ", query)
	stmt, err := txn.Prepare(query)
	if err != nil {
		log.Debug("Error when preparing statement: ", err)
		return err
	}
	defer stmt.Close()
	for _, row := range data.AddedRows.Rows {
		dataInsert := make(map[string]interface{}, len(data.AddedRows.Fields))
		var id string
		for index, field := range data.AddedRows.Fields {
			if field == schema.HashedPrimaryField {
				id = row[index].(string)
			}
			dataInsert[field] = row[index]
		}
		dataInsertJson, err := jsoniter.MarshalToString(dataInsert)
		if err != nil {
			log.Error("Error when marshaling data: ", err)
			return err
		}
		_, err = stmt.Exec(id, dataInsertJson)
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
		query := fmt.Sprintf("DELETE FROM \"%s\" WHERE %s = '%s'", l.tableName, name.IdColumn, id)
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
		var jsonbSet string
		updatedFields := lo.Keys(fieldUpdateData)
		for i, fieldName := range updatedFields {
			if i == 0 {
				jsonbSet = fmt.Sprintf(
					"jsonb_set(%s, '{%s}', '%s'::jsonb)",
					name.TableDataDataColumn,
					fieldName,
					formatVariableToPostgresStatementValue(fieldUpdateData[fieldName]),
				)
			} else {
				jsonbSet = fmt.Sprintf(
					"jsonb_set(%s, '{%s}', '%s'::jsonb)",
					jsonbSet,
					fieldName,
					formatVariableToPostgresStatementValue(fieldUpdateData[fieldName]),
				)
			}
		}
		query := fmt.Sprintf(
			"UPDATE \"%s\" SET %s = %s, %s = %s WHERE %s = '%s'",
			l.tableName,
			name.TableDataDataColumn, jsonbSet,
			name.UpdatedAtColumn, "NOW()",
			name.IdColumn, rowId,
		)
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
		var jsonbSet string
		addedFields := lo.Keys(fieldAddData)
		for i, fieldName := range addedFields {
			if i == 0 {
				jsonbSet = fmt.Sprintf(
					"jsonb_set(%s, '{%s}', '%s'::jsonb)",
					name.TableDataDataColumn,
					fieldName,
					formatVariableToPostgresStatementValue(fieldAddData[fieldName]),
				)
			} else {
				jsonbSet = fmt.Sprintf(
					"jsonb_set(%s, '{%s}', '%s'::jsonb)",
					jsonbSet,
					fieldName,
					formatVariableToPostgresStatementValue(fieldAddData[fieldName]),
				)
			}
		}
		query := fmt.Sprintf(
			"UPDATE \"%s\" SET %s = %s, %s = %s WHERE %s = '%s'",
			l.tableName,
			name.TableDataDataColumn, jsonbSet,
			name.UpdatedAtColumn, "NOW()",
			name.IdColumn, rowId,
		)
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
		var jsonbSet string
		for i, fieldName := range fieldsToDelete {
			if i == 0 {
				jsonbSet = fmt.Sprintf("jsonb_set(%s, '{%s}', '%s'::jsonb)", name.TableDataDataColumn, fieldName, "null")
			} else {
				jsonbSet = fmt.Sprintf("jsonb_set(%s, '{%s}', '%s'::jsonb)", jsonbSet, fieldName, "null")
			}
		}
		query := fmt.Sprintf(
			"UPDATE \"%s\" SET %s = %s, %s = %s WHERE %s = '%s'",
			l.tableName,
			name.TableDataDataColumn, jsonbSet,
			name.UpdatedAtColumn, "NOW()",
			name.IdColumn, rowId,
		)
		log.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			return err
		}
	}

	log.Info("Loaded deleted fields to postgres")

	return nil
}
