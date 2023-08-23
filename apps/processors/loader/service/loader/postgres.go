package loader

import (
	"database/sql"
	"fmt"
	"loader/libs/schema"
	"loader/pkg/config"
	"strings"
	"sync"

	jsoniter "github.com/json-iterator/go"
	pq "github.com/lib/pq"
	"github.com/samber/lo"

	log "github.com/sirupsen/logrus"
)

// const

type PostgresTableDataColumnName string

const (
	PostgresTableDataIdColumn    PostgresTableDataColumnName = "id"
	PostgresTableDataDataColumn  PostgresTableDataColumnName = "data"
	PostgresTableSchemaName      string                      = "schema"
	PostgresTableSchemaFieldName string                      = "schema_field"
)

var (
	PostgresTableDataColumns = map[PostgresTableDataColumnName]string{
		PostgresTableDataIdColumn:   "text",
		PostgresTableDataDataColumn: "jsonb",
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
	query := fmt.Sprintf(
		`CREATE TABLE IF NOT EXISTS %s (id serial PRIMARY KEY, data_source_id text, version integer DEFAULT 1);
		CREATE INDEX IF NOT EXISTS idx_data_source_id ON schema (data_source_id)`,
		PostgresTableSchemaName,
	)
	log.Debug("Query: ", query)
	_, err = dbConn.Exec(query)
	if err != nil {
		return err
	}
	query = fmt.Sprintf(
		`CREATE TABLE IF NOT EXISTS %s (
			id serial PRIMARY KEY NOT NULL,
			hashed_name text NOT NULL,
			schema_id serial NOT NULL,
			name text NOT NULL,
			type text NOT NULL,
			original_type text NOT NULL,
			nullable boolean DEFAULT true NOT NULL,
			enum jsonb,
			readonly boolean DEFAULT false NOT NULL,
			is_primary boolean DEFAULT false NOT NULL,
			FOREIGN KEY (schema_id) REFERENCES schema (id) ON DELETE CASCADE
		);
		CREATE INDEX IF NOT EXISTS idx_schema_id ON schema_field (schema_id)`,
		PostgresTableSchemaFieldName,
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

	l.tableName = fmt.Sprintf("_%s", l.DatasourceId)

	return nil
}

func (l *PostgreLoader) Close() error {
	return nil
}

func (l *PostgreLoader) Load(data *LoaderData) error {
	log.Info("Loading data to postgres")
	txn, err := l.dbConn.Begin()
	if err != nil {
		return err
	}
	defer txn.Rollback()

	l.setTimezone(txn)

	if l.PrevVersion == 0 {
		err = l.loadSchema(txn, data)
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

	fields := make([]string, 0, len(PostgresTableDataColumns))
	for fieldName, fieldType := range PostgresTableDataColumns {
		fields = append(fields, fmt.Sprintf("%s %s", fieldName, fieldType))
	}
	query := fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s (%s)", l.tableName, strings.Join(fields, ","))
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
	query := fmt.Sprintf("SELECT id FROM %s WHERE data_source_id = $1", PostgresTableSchemaName)
	log.Debug("Query: ", query)
	err := txn.QueryRow(query, l.DatasourceId).Scan(&schemaId)
	if err != nil {
		if err == sql.ErrNoRows {
			// create schema
			log.Info("Creating schema")
			query = fmt.Sprintf("INSERT INTO %s (data_source_id) VALUES ($1) RETURNING id", PostgresTableSchemaName)
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
	query = pq.CopyIn(PostgresTableSchemaFieldName, "hashed_name", "schema_id", "name", "type", "original_type", "nullable", "enum", "readonly", "is_primary")
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
	query := fmt.Sprintf("SELECT id FROM %s WHERE data_source_id = $1", PostgresTableSchemaName)
	log.Debug("Query: ", query)
	err := txn.QueryRow(query, l.DatasourceId).Scan(&schemaId)
	if err != nil {
		return err
	}

	// deleted fields
	if len(data.SchemaChanges.DeletedFields) > 0 {
		log.Info("Deleting fields")
		// delete from schema fields
		query = fmt.Sprintf("DELETE FROM %s WHERE schema_id = %d AND hashed_name IN ('%s')", PostgresTableSchemaFieldName, schemaId, strings.Join(data.SchemaChanges.DeletedFields, "','"))
		log.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			log.Error("Error when deleting fields: ", err)
			return err
		}
		// delete from table data
		query = fmt.Sprintf("UPDATE %s SET %s = %s - ARRAY[%s]", l.tableName, PostgresTableDataDataColumn, PostgresTableDataDataColumn, strings.Join(
			lo.Map(data.SchemaChanges.DeletedFields, func(field string, _ int) string {
				return fmt.Sprintf("'%s'", field)
			}), ","),
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
		query = pq.CopyIn(PostgresTableSchemaFieldName, "hashed_name", "schema_id", "name", "type", "original_type", "nullable", "enum", "readonly", "is_primary")
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
				"UPDATE %s SET name = '%s', type = '%s', original_type = '%s', nullable = %t, enum = '%s', readonly = %t, is_primary = %t WHERE schema_id = %d AND hashed_name = '%s'",
				PostgresTableSchemaFieldName, field.Name, field.Type, field.OriginalType, field.Nullable, enum, field.Readonly, field.Primary, schemaId, fieldId,
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
	log.Info("Loading added rows to postgres")

	if len(data.AddedRows.Rows) == 0 {
		log.Info("No added rows to load")
		return nil
	}

	log.Debug("Inserting data")
	query := pq.CopyIn(l.tableName, string(PostgresTableDataIdColumn), string(PostgresTableDataDataColumn))
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
		query := fmt.Sprintf("DELETE FROM %s WHERE %s = '%s'", l.tableName, PostgresTableDataIdColumn, id)
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
				jsonbSet = fmt.Sprintf("jsonb_set(%s, '{%s}', '%s'::jsonb)", PostgresTableDataDataColumn, fieldName, formatVariableToPostgresStatementValue(fieldUpdateData[fieldName]))
			} else {
				jsonbSet = fmt.Sprintf("jsonb_set(%s, '{%s}', '%s'::jsonb)", jsonbSet, fieldName, formatVariableToPostgresStatementValue(fieldUpdateData[fieldName]))
			}
		}
		query := fmt.Sprintf("UPDATE %s SET %s = %s WHERE %s = '%s'", l.tableName, PostgresTableDataDataColumn, jsonbSet, PostgresTableDataIdColumn, rowId)
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
				jsonbSet = fmt.Sprintf("jsonb_set(%s, '{%s}', '%s'::jsonb)", PostgresTableDataDataColumn, fieldName, formatVariableToPostgresStatementValue(fieldAddData[fieldName]))
			} else {
				jsonbSet = fmt.Sprintf("jsonb_set(%s, '{%s}', '%s'::jsonb)", jsonbSet, fieldName, formatVariableToPostgresStatementValue(fieldAddData[fieldName]))
			}
		}
		query := fmt.Sprintf("UPDATE %s SET %s = %s WHERE %s = '%s'", l.tableName, PostgresTableDataDataColumn, jsonbSet, PostgresTableDataIdColumn, rowId)
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
				jsonbSet = fmt.Sprintf("jsonb_set(%s, '{%s}', '%s'::jsonb)", PostgresTableDataDataColumn, fieldName, "null")
			} else {
				jsonbSet = fmt.Sprintf("jsonb_set(%s, '{%s}', '%s'::jsonb)", jsonbSet, fieldName, "null")
			}
		}
		query := fmt.Sprintf("UPDATE %s SET %s = %s WHERE %s = '%s'", l.tableName, PostgresTableDataDataColumn, jsonbSet, PostgresTableDataIdColumn, rowId)
		log.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			return err
		}
	}

	log.Info("Loaded deleted fields to postgres")

	return nil
}
