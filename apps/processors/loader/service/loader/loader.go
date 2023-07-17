package loader

import (
	"loader/libs/schema"
	"loader/pkg/config"

	log "github.com/sirupsen/logrus"
)

type LoaderType string

type AddedRowsData struct {
	Fields []string
	Rows   [][]interface{}
}
type DeletedRowData string
type UpdatedFieldData map[string]interface{}
type LoaderData struct {
	Schema            schema.TableSchema
	AddedRows         AddedRowsData
	DeletedRows       []DeletedRowData
	UpdatedFieldsData []UpdatedFieldData
}

type Loader interface {
	Setup() error
	Load(data *LoaderData) error
	Close() error
}

func New(loaderType LoaderType, dataSourceId string, syncVersion int) (Loader, error) {
	var loader Loader
	switch loaderType {
	case LoaderType(config.DbTypePostgres):
		loader = &PostgreLoader{
			DatasourceId: dataSourceId,
			SyncVersion:  syncVersion,
		}
	}
	if loader != nil {
		err := loader.Setup()
		if err != nil {
			return nil, err
		}
	}
	return loader, nil
}

func NewDefaultLoader(dataSourceId string, syncVersion int) (Loader, error) {
	log.Debug("Initializing default loader")
	return New(LoaderType(config.AppConfig.DbType), dataSourceId, syncVersion)
}
