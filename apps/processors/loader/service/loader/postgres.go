package loader

import (
	"context"
	"database/sql"
	"fmt"
	"loader/libs/schema"
	"loader/pkg/config"
	"loader/service"
	"loader/service/getter"
	commonName "loader/service/loader/namespace"
	name "loader/service/loader/namespace/postgres"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	jsoniter "github.com/json-iterator/go"
	pq "github.com/lib/pq"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"

	log "github.com/sirupsen/logrus"
)

// const

var (
	dataTableColumns = map[name.TableColumn]string{
		name.IdColumn:            "uuid PRIMARY KEY NOT NULL",
		name.TableDataDataColumn: "jsonb",
		name.MetadataColumn:      "jsonb",
		name.CreatedAtColumn:     "timestamptz DEFAULT NOW() NOT NULL",
		name.UpdatedAtColumn:     "timestamptz DEFAULT NOW() NOT NULL",
		name.IsDeletedColumn:     "boolean DEFAULT false NOT NULL",
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
	idempotencyTableColumns = map[name.TableColumn]string{
		name.OperationColumn: "varchar(100) NOT NULL",
		name.StatusColumn: fmt.Sprintf("varchar(20) DEFAULT '%[2]s'", commonName.RunningStatus, commonName.CompletedStatus),
		name.MetadataColumn: "jsonb",
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
		CREATE INDEX IF NOT EXISTS idx_data_source_id ON %[1]s (%[3]s)`,
		name.SchemaTable,
		strings.Join(columns, ","),
		name.DataSourceIdColumn,
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

	// create idempotency table
	columns = make([]string, 0, len(idempotencyTableColumns))
	for colName, colType := range idempotencyTableColumns {
		columns = append(columns, fmt.Sprintf("%s %s", colName, colType))
	}
	query = fmt.Sprintf(
		`CREATE TABLE IF NOT EXISTS %s (%s);
		CREATE INDEX IF NOT EXISTS idx_operation ON %[1]s (%[3]s)`,
		name.IdempotencyTable,
		strings.Join(columns, ","),
		name.OperationColumn,
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

// * UTILS ***
func formatVariableToPostgresStatementValue(a interface{}) string {
	switch v := a.(type) {
	case string:
		// r := strings.NewReplacer("'", "''", "\"", "\\\"")
		r := strings.NewReplacer("'", "''")
		return r.Replace(strconv.Quote(v))
	case nil:
		return "null"
	default:
		return fmt.Sprintf("%v", v)
	}
}
func escapeSingleQuote(a string) string {
	r := strings.NewReplacer("'", "''")
	return r.Replace(a)
}
func formatEnumToPostgresStatementValue(enum []interface{}) (string, error) {
	marshalled, err := jsoniter.MarshalToString(enum)
	if err != nil {
		log.Error("Error when marshaling enum: ", err)
		return "", err
	}
	return escapeSingleQuote(marshalled), nil
}

// ***********

type PostgreLoader struct {
	DatasourceId string
	SyncVersion  uint
	PrevVersion  uint

	tableName string

	rowErrorMap map[string]bool

	dbConn *sql.DB

	// loger
	logger *log.Entry

	// result
	result *service.LoadedResult
}

type PostgresAddRowData struct {
	RowId string
	Data  *string // json
}

func (l *PostgreLoader) Setup() error {
	log.Debug("Setting up postgres loader")

	// logger
	logger := log.New()
	logger.SetOutput(os.Stdout)
	logger.SetFormatter(&log.JSONFormatter{})
	logger.SetLevel(log.DebugLevel)
	loggerEntry := logger.WithFields(log.Fields{
		"dataSourceId": l.DatasourceId,
		// "syncVersion":  l.SyncVersion,
	})
	l.logger = loggerEntry

	dbConn, err := getPostgresDbConnection()
	if err != nil {
		log.Error("Error when getting db connection: ", err)
		return err
	}
	l.dbConn = dbConn

	if (l.tableName == "") || (l.tableName == "null") {
		l.tableName = fmt.Sprintf("_%s", l.DatasourceId)
	}

	l.rowErrorMap = make(map[string]bool)

	return nil
}

func (l *PostgreLoader) Close() error {
	return nil
}

func (l *PostgreLoader) Load(ctx context.Context, getter *getter.Getter) (*service.LoadedResult, error) {
	l.logger.Info("Loading data to postgres")

	// init transaction
	txn, err := l.dbConn.BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelReadCommitted,
	})
	if err != nil {
		return nil, err
	}
	defer txn.Rollback()

	err = l.waitForCurrentlyLoading(txn)
	if err != nil {
		return nil, err
	}

	isAlreadyLoaded, err := l.checkIsAlreadyLoadedInTransaction(txn)
	if err != nil {
		return nil, err
	}
	if isAlreadyLoaded {
		l.logger.Info("Already loaded")
		l.getSavedResult(txn)
		return l.result, nil
	}

	// get load data
	l.logger.Info("Getting diff data")
	data, err := getter.GetLoadData()
	if err != nil {
		l.logger.Error("Error when getting diff data: ", err)
		return nil, err
	}
	l.setTimezone(txn)

	if l.PrevVersion == 0 {
		err := l.loadSchema(txn, data)
		if err != nil {
			return nil, l.checkAndMappingError(err)
		}
		err = l.initTable(txn, data)
		if err != nil {
			return nil, l.checkAndMappingError(err)
		}
		err = l.loadAddedRows(txn, data)
		if err != nil {
			return nil, l.checkAndMappingError(err)
		}
		err = l.loadRowErrorMetadata(txn)
		if err != nil {
			return nil, l.checkAndMappingError(err)
		}
	} else {
		err := l.loadSchemaChange(txn, data)
		if err != nil {
			return nil, l.checkAndMappingError(err)
		}

		if IsDataChanged(data) {
			err = l.loadRemovedRows(txn, data)
			if err != nil {
				return nil, l.checkAndMappingError(err)
			}
			err = l.loadAddedRows(txn, data)
			if err != nil {
				return nil, l.checkAndMappingError(err)
			}
			err = l.loadUpdateFields(txn, data)
			if err != nil {
				return nil, l.checkAndMappingError(err)
			}
			err = l.loadAddedFields(txn, data)
			if err != nil {
				return nil, l.checkAndMappingError(err)
			}
			err = l.loadDeletedFields(txn, data)
			if err != nil {
				return nil, l.checkAndMappingError(err)
			}
			err = l.loadRowErrorMetadata(txn)
			if err != nil {
				return nil, l.checkAndMappingError(err)
			}
		}
	}

	l.result = CaculateLoadedResult(data)

	err = l.markAsLoadedAndRemovePreviousMark(txn)

	err = txn.Commit()
	if err != nil {
		txn.Rollback()
		return nil, l.checkAndMappingError(err)
	}

	return l.result, nil
}

func (l *PostgreLoader) setTimezone(txn *sql.Tx) error {
	query := fmt.Sprintf("SET TIMEZONE = 'UTC'")
	_, err := txn.Exec(query)
	if err != nil {
		return err
	}

	return nil
}

func (l *PostgreLoader) getLoaderOperationName(syncVersion uint) string {
	return fmt.Sprintf("load-%s-%d", l.DatasourceId, syncVersion)
}

func (l *PostgreLoader) addRowError(rowId string) {
	if _, ok := l.rowErrorMap[rowId]; !ok {
		l.rowErrorMap[rowId] = true
	}
}

func (l *PostgreLoader) checkIsAlreadyLoaded() (bool, error) {
	var count int
	query := fmt.Sprintf(
		"SELECT COUNT(*) FROM %s WHERE %s = '%s' AND %s = '%s'",
		name.IdempotencyTable,
		name.OperationColumn,
		l.getLoaderOperationName(l.SyncVersion),
		name.StatusColumn,
		commonName.CompletedStatus,
	)
	err := l.dbConn.QueryRow(query).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("error when checking already loaded: %w", err)
	}
	return count > 0, nil
}

func (l *PostgreLoader) checkIsAlreadyLoadedInTransaction(txn *sql.Tx) (bool, error) {
	var count int
	query := fmt.Sprintf(
		"SELECT COUNT(*) FROM %s WHERE %s = '%s' AND %s = '%s'",
		name.IdempotencyTable,
		name.OperationColumn,
		l.getLoaderOperationName(l.SyncVersion),
		name.StatusColumn,
		commonName.CompletedStatus,
	)
	err := txn.QueryRow(query).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("error when checking already loaded in transaction: %w", err)
	}
	return count > 0, nil
}

func (l *PostgreLoader) waitForCurrentlyLoading(txn *sql.Tx) error {
	for {
		var isAcquiredLock bool
		query := fmt.Sprintf(
			"SELECT pg_try_advisory_xact_lock(hashtext('%s'))",
			l.getLoaderOperationName(l.SyncVersion),
		)
		err := txn.QueryRow(query).Scan(&isAcquiredLock)
		if err != nil {
			return fmt.Errorf("error when acquiring lock: %w", err)
		}
		if isAcquiredLock {
			l.logger.Debug("Not currently loading")
			break
		} else {
			l.logger.Debug("Currently loading, wait for 10 seconds")
			time.Sleep(10 * time.Second)
		}
	}


	return nil
}

func (l *PostgreLoader) markAsLoadedAndRemovePreviousMark(txn *sql.Tx) error {
	var eg errgroup.Group

	metadata, err := jsoniter.MarshalToString(l.result)
	if err != nil {
		return fmt.Errorf("error when marshaling load metadata: %w", err)
	}

	// Mark as loaded
	eg.Go(func() error {
		query := fmt.Sprintf(
			"INSERT INTO %s (%s, %s, %s) VALUES ('%s', '%s', '%s'::jsonb)",
			name.IdempotencyTable,
			name.OperationColumn,
			name.StatusColumn,
			name.MetadataColumn,
			l.getLoaderOperationName(l.SyncVersion),
			commonName.CompletedStatus,
			metadata,
		)
		_, err := txn.Exec(query)
		if err != nil {
			return fmt.Errorf("error when marking as loaded: %w", err)
		}
		return nil
	})

	// Remove mark of previous version
	eg.Go(func() error {
		query := fmt.Sprintf(
			"DELETE FROM %s WHERE %s = '%s'",
			name.IdempotencyTable,
			name.OperationColumn,
			l.getLoaderOperationName(l.PrevVersion),
		)
		_, err := txn.Exec(query)
		if err != nil {
			return fmt.Errorf("error when removing mark of prev version: %w", err)
		}
		return nil
	})

	if err := eg.Wait(); err != nil {
		return err
	}

	return nil
}

func (l *PostgreLoader) getSavedResult(txn *sql.Tx) error {
	var metadata string
	query := fmt.Sprintf(
		"SELECT %s FROM %s WHERE %s = '%s'",
		name.MetadataColumn,
		name.IdempotencyTable,
		name.OperationColumn,
		l.getLoaderOperationName(l.SyncVersion),
	)
	err := txn.QueryRow(query).Scan(&metadata)
	if err != nil {
		return err
	}
	err = jsoniter.UnmarshalFromString(metadata, &l.result)
	if err != nil {
		return err
	}
	return nil
}

func (l *PostgreLoader) checkAndMappingError(originalErr error) error {
	// check for case of concurrent load
	isAlreadyLoaded, err := l.checkIsAlreadyLoaded()
	if err != nil {
		return err
	}
	if isAlreadyLoaded {
		l.logger.Info("Already loaded")
		return nil
	} else {
		return originalErr
	}
}

func (l *PostgreLoader) initTable(txn *sql.Tx, data *service.LoaderData) error {
	l.logger.Info("Initilizing table")

	fields := make([]string, 0, len(dataTableColumns))
	for fieldName, fieldType := range dataTableColumns {
		fields = append(fields, fmt.Sprintf("%s %s", fieldName, fieldType))
	}
	query := fmt.Sprintf("CREATE TABLE IF NOT EXISTS \"%s\" (%s)", l.tableName, strings.Join(fields, ","))
	// l.logger.Debug("Query: ", query)
	_, err := txn.Exec(query)
	if err != nil {
		return err
	}

	l.logger.Info("Initialized table to postgres")

	return nil
}

func (l *PostgreLoader) loadSchema(txn *sql.Tx, data *service.LoaderData) error {
	l.logger.Info("Loading schema")

	// get schema id if exists
	var schemaId int
	query := fmt.Sprintf(`SELECT id FROM %s WHERE %s = $1`, name.SchemaTable, name.DataSourceIdColumn)
	// l.logger.Debug("Query: ", query)
	err := txn.QueryRow(query, l.DatasourceId).Scan(&schemaId)
	if err != nil {
		if err == sql.ErrNoRows {
			// create schema
			l.logger.Info("Creating schema")
			query = fmt.Sprintf("INSERT INTO %s (%s) VALUES ($1) RETURNING id", name.SchemaTable, name.DataSourceIdColumn)
			// l.logger.Debug("Query: ", query)
			err = txn.QueryRow(query, l.DatasourceId).Scan(&schemaId)
			if err != nil {
				return err
			}
			if data.Metadata != nil {
				// insert metadata
				metadata, err := jsoniter.MarshalToString(data.Metadata)
				if err != nil {
					return err
				}
				query = fmt.Sprintf(
					"UPDATE %s SET %s = '%s'::jsonb WHERE %s = %d",
					name.SchemaTable,
					name.MetadataColumn, metadata,
					name.IdColumn, schemaId,
				)
				// l.logger.Debug("Query: ", query)
				_, err = txn.Exec(query)
				if err != nil {
					return err
				}
			}
		} else {
			return err
		}
	}

	// create schema fields
	l.logger.Info("Creating schema fields")
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
	// l.logger.Debug("Query: ", query)
	stmt, err := txn.Prepare(query)
	if err != nil {
		l.logger.Debug("Error when preparing statement: ", err)
		return err
	}
	defer stmt.Close()
	for fieldId, field := range data.Schema {
		enum, err := formatEnumToPostgresStatementValue(field.Enum)
		if err != nil {
			return err
		}
		_, err = stmt.Exec(fieldId, schemaId, field.Name, field.Type, field.OriginalType, field.Nullable, enum, field.Readonly, field.Primary)
		if err != nil {
			l.logger.Debug("Error when inserting field: ", err)
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

	l.logger.Info("Loaded schema")

	return nil
}

func (l *PostgreLoader) loadSchemaChange(txn *sql.Tx, data *service.LoaderData) error {
	l.logger.Info("Loading schema changes")

	// get schema id
	var schemaId int
	query := fmt.Sprintf("SELECT id FROM %s WHERE %s = $1", name.SchemaTable, name.DataSourceIdColumn)
	// l.logger.Debug("Query: ", query)
	err := txn.QueryRow(query, l.DatasourceId).Scan(&schemaId)
	if err != nil {
		return err
	}

	// deleted fields
	if len(data.SchemaChanges.DeletedFields) > 0 {
		l.logger.Info("Deleting fields")
		// delete from schema fields
		query = fmt.Sprintf(
			"DELETE FROM %s WHERE %s = %d AND %s IN ('%s')",
			name.SchemaFieldTable,
			name.SchemaIdColumn,
			schemaId,
			name.HashedNameColumn,
			strings.Join(data.SchemaChanges.DeletedFields, "','"),
		)
		// l.logger.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			l.logger.Error("Error when deleting fields: ", err)
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
		// l.logger.Debug("Query: ", query)
		_, err = txn.Exec(query)
		if err != nil {
			l.logger.Error("Error when deleting fields from table data: ", err)
			return err
		}
	}

	// added fields
	if len(data.SchemaChanges.AddedFields) > 0 {
		l.logger.Info("Adding schema fields")
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
		// l.logger.Debug("Query: ", query)
		stmt, err := txn.Prepare(query)
		if err != nil {
			l.logger.Debug("Error when preparing statement: ", err)
			return err
		}
		defer stmt.Close()
		for fieldId, field := range data.SchemaChanges.AddedFields {
			enum, err := formatEnumToPostgresStatementValue(field.Enum)
			if err != nil {
				return err
			}
			_, err = stmt.Exec(fieldId, schemaId, field.Name, field.Type, field.OriginalType, field.Nullable, enum, field.Readonly, field.Primary)
			if err != nil {
				l.logger.Debug("Error when inserting field: ", err)
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
		l.logger.Info("Updating fields")

		for fieldId, field := range data.SchemaChanges.UpdatedFields {
			enum, err := formatEnumToPostgresStatementValue(field.Enum)
			if err != nil {
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
			// l.logger.Debug("Query: ", query)
			_, err = txn.Exec(query)
			if err != nil {
				l.logger.Error("Error when updating fields: ", err)
				return err
			}
		}
	}

	l.logger.Info("Loaded schema changes")

	return nil
}

func (l *PostgreLoader) loadAddedRows(txn *sql.Tx, data *service.LoaderData) error {
    l.logger.Info("Loading added rows to postgres, count: ", len(data.AddedRows.Rows))

    if len(data.AddedRows.Rows) == 0 {
        l.logger.Info("No added rows to load")
        return nil
    }

	pipelineSize := 5000

    query := pq.CopyIn(l.tableName, string(name.IdColumn), string(name.TableDataDataColumn))
    // l.logger.Debug("Query: ", query)

	marshaledChan := make(chan PostgresAddRowData, pipelineSize)

	group, _ := errgroup.WithContext(context.Background())
	group.Go(func() error {
		l.logger.Debug("Start marshaling data")
		for _, row := range data.AddedRows.Rows {
			dataInsert := make(map[string]interface{}, len(data.AddedRows.Fields))
			var insertRowObject PostgresAddRowData
			isRowHasError := false
			for index, field := range data.AddedRows.Fields {
				fieldData := row[index]
				if field == schema.HashedPrimaryField {
					insertRowObject.RowId = fieldData.(string)
				}
				dataInsert[field] = fieldData
				if fieldData == schema.ErrorValue && !isRowHasError {
					isRowHasError = true
				}
			}
			if isRowHasError {
				l.addRowError(insertRowObject.RowId)
			}
			dataInsertJson, err := jsoniter.MarshalToString(dataInsert)
			if err != nil {
				l.logger.Error("Error when marshaling data: ", err)
				return err
			}
			insertRowObject.Data = &dataInsertJson
			marshaledChan <- insertRowObject
			// l.logger.Debug("Marshaled data for row ", insertRowObject.RowId)
		}
		close(marshaledChan)

		l.logger.Debug("Finished marshaling data")

		return nil
	})
	group.Go(func() error {
		l.logger.Debug("Preparing insert data")

		stmt, err := txn.Prepare(query)
		if err != nil {
			l.logger.Debug("Error when preparing statement: ", err)
			return err
		}
		defer stmt.Close()

		for addRowData := range marshaledChan {
			// l.logger.Debug("Preparing data for row ", addRowData.RowId)
			_, err = stmt.Exec(addRowData.RowId, *addRowData.Data)
			if err != nil {
				l.logger.Debug("Error when prepare data: ", err)
				return err
			}
		}
		l.logger.Debug("Executing load statement")
		_, err = stmt.Exec()
		if err != nil {
			l.logger.Debug("Error when inserting data: ", err)
			return err
		}
		err = stmt.Close()
		if err != nil {
			l.logger.Debug("Error when closing statement: ", err)
			return err
		}
		return nil
	})

	err := group.Wait()
	if err != nil {
		return err
	}

    l.logger.Info("Loaded added rows to postgres")

    return nil
}

func (l *PostgreLoader) loadRemovedRows(txn *sql.Tx, data *service.LoaderData) error {
	l.logger.Info("Loading removed rows to postgres")

	if len(data.DeletedRows) == 0 {
		l.logger.Info("No removed rows to load")
		return nil
	}

	for _, id := range data.DeletedRows {
		// query := fmt.Sprintf("DELETE FROM \"%s\" WHERE %s = '%s'", l.tableName, name.IdColumn, id)

		// update deleted_at = true
		query := fmt.Sprintf(
			"UPDATE \"%s\" SET %s = true, %s = %s WHERE %s = '%s'",
			l.tableName,
			name.IsDeletedColumn,
			name.UpdatedAtColumn, "NOW()",
			name.IdColumn, id,
		)
		// l.logger.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			return err
		}
	}

	l.logger.Info("Loaded removed rows to postgres")

	return nil
}

func (l *PostgreLoader) loadUpdateFields(txn *sql.Tx, data *service.LoaderData) error {
	l.logger.Info("Loading updated fields rows")

	if len(data.UpdatedFields) == 0 {
		l.logger.Info("No updated fields rows to load")
		return nil
	}

	for rowId, fieldUpdateData := range data.UpdatedFields {
		isRowHasError := false
		var jsonbSet string
		updatedFields := lo.Keys(fieldUpdateData)
		for i, fieldName := range updatedFields {
			fieldData := fieldUpdateData[fieldName]
			if i == 0 {
				jsonbSet = fmt.Sprintf(
					"jsonb_set(%s, '{%s}', '%s'::jsonb)",
					name.TableDataDataColumn,
					fieldName,
					formatVariableToPostgresStatementValue(fieldData),
				)
			} else {
				jsonbSet = fmt.Sprintf(
					"jsonb_set(%s, '{%s}', '%s'::jsonb)",
					jsonbSet,
					fieldName,
					formatVariableToPostgresStatementValue(fieldData),
				)
			}
			if fieldData == schema.ErrorValue && !isRowHasError {
				isRowHasError = true
			}
		}
		if isRowHasError {
			l.addRowError(rowId)
		}
		query := fmt.Sprintf(
			"UPDATE \"%s\" SET %s = %s, %s = %s WHERE %s = '%s'",
			l.tableName,
			name.TableDataDataColumn, jsonbSet,
			name.UpdatedAtColumn, "NOW()",
			name.IdColumn, rowId,
		)
		// l.logger.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			return err
		}
	}

	l.logger.Info("Loaded updated fields")

	return nil
}

func (l *PostgreLoader) loadAddedFields(txn *sql.Tx, data *service.LoaderData) error {
	l.logger.Info("Loading added fields rows")

	if len(data.AddedFields) == 0 {
		l.logger.Info("No added fields rows to load")
		return nil
	}

	// updateQueriesMap := make(map[string][]string) // query -> rowIds
	// queryGroup, _ := errgroup.WithContext(context.Background())
	// queryGroup.SetLimit(10)

	for rowId, fieldAddData := range data.AddedFields {
		isRowHasError := false
		var jsonbSet string
		addedFields := lo.Keys(fieldAddData)
		for i, fieldName := range addedFields {
			fieldData := fieldAddData[fieldName]
			if i == 0 {
				jsonbSet = fmt.Sprintf(
					"jsonb_set(%s, '{%s}', '%s'::jsonb)",
					name.TableDataDataColumn,
					fieldName,
					formatVariableToPostgresStatementValue(fieldData),
				)
			} else {
				jsonbSet = fmt.Sprintf(
					"jsonb_set(%s, '{%s}', '%s'::jsonb)",
					jsonbSet,
					fieldName,
					formatVariableToPostgresStatementValue(fieldData),
				)
			}
			if fieldData == schema.ErrorValue && !isRowHasError {
				isRowHasError = true
			}
		}
		if isRowHasError {
			l.addRowError(rowId)
		}
		query := fmt.Sprintf(
			"UPDATE \"%s\" SET %s = %s, %s = %s WHERE %s = '%s'",
			l.tableName,
			name.TableDataDataColumn, jsonbSet,
			name.UpdatedAtColumn, "NOW()",
			name.IdColumn, rowId,
		)
		l.logger.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			return err
		}
	}

	// err := batchGroup.Wait()
	// if err != nil {
		// return err
	// }

	return nil
}

func (l *PostgreLoader) loadDeletedFields(txn *sql.Tx, data *service.LoaderData) error {
	l.logger.Info("Loading deleted fields rows")

	if len(data.DeletedFields) == 0 {
		l.logger.Info("No deleted fields rows to load")
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
		// l.logger.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			return err
		}
	}

	l.logger.Info("Loaded deleted fields to postgres")

	return nil
}

func (l *PostgreLoader) loadRowErrorMetadata(txn *sql.Tx) error {
	l.logger.Info("Loading row error metadata")

	if len(l.rowErrorMap) == 0 {
		l.logger.Info("No new error metadata to load")
		if l.PrevVersion == 0 {
			return nil
		}
	} else {
		for rowId := range l.rowErrorMap {
			jsonbSet := fmt.Sprintf(
				"jsonb_set(coalesce(%s, '{}'), '{%s}', %s::jsonb)",
				name.MetadataColumn,
				name.HasErrorColumn,
				"'true'",
			)
			query := fmt.Sprintf(
				"UPDATE \"%s\" SET %s = %s WHERE %s = '%s'",
				l.tableName,
				name.MetadataColumn, jsonbSet,
				name.IdColumn, rowId,
			)
			// l.logger.Debug("Query: ", query)
			_, err := txn.Exec(query)
			if err != nil {
				return err
			}
		}
	}

	if l.PrevVersion != 0 {
		// clean no longer error rows
		query := fmt.Sprintf(
			"UPDATE \"%s\" SET %[2]s = %[2]s - ARRAY['%[3]s'] WHERE (%[2]s->'%[3]s')::bool IS TRUE AND NOT EXISTS (SELECT 1 FROM jsonb_each_text(%[4]s) AS json_data WHERE json_data.value = '%[5]s')",
			l.tableName,
			name.MetadataColumn,
			name.HasErrorColumn,
			name.TableDataDataColumn,
			schema.ErrorValue,
		)
		// l.logger.Debug("Query: ", query)
		_, err := txn.Exec(query)
		if err != nil {
			return err
		}
		l.logger.Debug("Cleaned no longer error rows")
	}

	l.logger.Info("Loaded row error metadata to postgres")

	return nil
}
