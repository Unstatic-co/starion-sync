package loader

import (
	"database/sql"
	"fmt"
	"loader/libs/schema"
	"loader/pkg/config"

	pq "github.com/lib/pq"

	log "github.com/sirupsen/logrus"
)

var (
	ProgresTypeMap = map[schema.DataType]string{
		schema.String:   "text",
		schema.Number:   "numeric",
		schema.DateTime: "timestamp",
		schema.Boolean:  "boolean",
		schema.Array:    "text[]",
		schema.Unknown:  "text",
	}
)

type PostgreLoader struct {
	DatasourceId string
	SyncVersion  int
	conn         *sql.DB
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

	db.Query("SELECT 1")

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
	err := l.loadAddedRows(data)
	if err != nil {
		return err
	}

	return nil
}

func (l *PostgreLoader) loadAddedRows(data *LoaderData) error {
	log.Info("Loading added rows to postgres")
	txn, err := l.conn.Begin()
	if err != nil {
		return err
	}
	defer txn.Rollback()

	if l.SyncVersion == 1 {
		stmt, err := txn.Prepare(fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s (%s)", l.DatasourceId))
		if err != nil {
			return err
		}
		defer stmt.Close()
	}

	stmt, err := txn.Prepare(pq.CopyIn(l.DatasourceId, data.AddedRows.Fields...))
	if err != nil {
		return err
	}
	defer stmt.Close()
	_, err = stmt.Exec(data.AddedRows.Rows[0]...)
	if err != nil {
		return err
	}

	err = txn.Commit()
	if err != nil {
		return err
	}

	log.Info("Loaded added rows to postgres")

	return nil
}
