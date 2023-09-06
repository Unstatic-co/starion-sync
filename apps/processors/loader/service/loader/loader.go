package loader

import (
	"context"
	"loader/libs/schema"
	"loader/pkg/config"
	"loader/service"

	log "github.com/sirupsen/logrus"
)

type LoaderType string

type AddedRowsData struct {
	Fields []string
	Rows   [][]interface{}
}
type DeletedRowsData []string
type UpdatedFieldsData map[string]map[string]interface{}
type AddedFieldsData map[string]map[string]interface{}
type DeletedFieldsData map[string][]string
type LoaderData struct {
	Schema       schema.TableSchema
	PrimaryField string

	IsSchemaChanged bool
	SchemaChanges   service.SchemaDiffResult

	AddedRows     AddedRowsData
	DeletedRows   DeletedRowsData
	AddedFields   AddedFieldsData
	UpdatedFields UpdatedFieldsData
	DeletedFields DeletedFieldsData
}

type LoadedResult struct {
	AddedRowsCount   int  `json:"addedRowsCount"`
	DeletedRowsCount int  `json:"deletedRowsCount"`
	IsSchemaChanged  bool `json:"isSchemaChanged"`
}

type Loader interface {
	Setup() error
	Load(ctx context.Context, data *LoaderData) error
	Close() error
}

func Setup() {
	err := setupPostgresDbLoader()
	if err != nil {
		log.Fatalf("Fail to setup loader: %v", err)
		panic(err)
	}
}

func New(loaderType LoaderType, dataSourceId string, syncVersion uint, prevVersion uint) (Loader, error) {
	var loader Loader
	switch loaderType {
	case LoaderType(config.DbTypePostgres):
		loader = &PostgreLoader{
			DatasourceId: dataSourceId,
			SyncVersion:  syncVersion,
			PrevVersion:  prevVersion,
		}
	}
	if loader != nil {
		// setup
		err := loader.Setup()
		if err != nil {
			return nil, err
		}
	}
	return loader, nil
}

func NewDefaultLoader(dataSourceId string, syncVersion uint, prevVersion uint) (Loader, error) {
	log.Debug("Initializing default loader")
	return New(LoaderType(config.AppConfig.DbType), dataSourceId, syncVersion, prevVersion)
}
