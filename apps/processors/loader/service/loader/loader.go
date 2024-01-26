package loader

import (
	"context"
	"loader/pkg/config"
	"loader/service"
	"loader/service/getter"

	log "github.com/sirupsen/logrus"
)


type Loader interface {
	Setup() error
	Load(ctx context.Context, getter *getter.Getter) (*service.LoadedResult, error)
	Close() error
}

func Setup() {
	err := setupPostgresDbLoader()
	if err != nil {
		log.Fatalf("Fail to setup loader: %v", err)
		panic(err)
	}
}

func New(loaderType service.LoaderType, params service.LoaderParams) (Loader, error) {
	var loader Loader
	switch loaderType {
	case service.LoaderType(config.DbTypePostgres):
		loader = &PostgreLoader{
			DatasourceId: params.DataSourceId,
			SyncVersion:  params.SyncVersion,
			PrevVersion:  params.PrevVersion,
			tableName:    params.TableName,
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

func NewDefaultLoader(params service.LoaderParams) (Loader, error) {
	log.Debug("Initializing default loader")
	return New(service.LoaderType(config.AppConfig.DbType), params)
}