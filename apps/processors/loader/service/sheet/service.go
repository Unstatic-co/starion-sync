package sheet

import (
	"context"
	"loader/pkg/config"
	"loader/service"
	"loader/service/getter"
	"loader/service/loader"
	"loader/util/s3"

	log "github.com/sirupsen/logrus"
)

type SheetServiceInitParams struct {
	DataSourceId string      `json:"dataSourceId"`
	SyncVersion  uint        `json:"syncVersion"`
	PrevVersion  uint        `json:"prevVersion"`
	TableName    string      `json:"tableName"`
	Metadata     interface{} `json:"metadata"`
}

type SheetService struct {
	// info
	syncflowId   string
	dataSourceId string
	syncVersion  uint
	prevVersion  uint
	tableName    string
	metadata     interface{}

	// s3
	s3DiffDataHandler *s3.S3Handler
}

func NewService(params SheetServiceInitParams) (*SheetService, error) {
	var s SheetService
	s.dataSourceId = params.DataSourceId
	s.syncVersion = params.SyncVersion
	s.prevVersion = params.PrevVersion
	s.tableName = params.TableName
	s.metadata = params.Metadata

	// s3
	handler, err := s3.NewHandlerWithConfig(&s3.S3HandlerConfig{
		Endpoint:  config.AppConfig.S3Endpoint,
		Region:    config.AppConfig.S3Region,
		Bucket:    config.AppConfig.S3DiffDataBucket,
		AccessKey: config.AppConfig.S3AccessKey,
		SecretKey: config.AppConfig.S3SecretKey,
	})
	if err != nil {
		log.Error("Error when initializing s3 handler: ", err)
		return nil, err
	}
	s.s3DiffDataHandler = handler

	return &s, nil
}

func (s *SheetService) Load(ctx context.Context) (*service.LoadedResult, error) {
	log.Info("Start load data")

	// create getter
	getter, err := getter.NewGetter(getter.GetterInitParams{
		DataSourceId: s.dataSourceId,
		SyncVersion:  s.syncVersion,
		PrevVersion:  s.prevVersion,
		Metadata:     s.metadata,
	})
	if err != nil {
		return nil, err
	}

	// execute loader
	log.Debug("Executing loader")
	loaderInstance, err := loader.NewDefaultLoader(service.LoaderParams{
		DataSourceId: s.dataSourceId,
		SyncVersion:  s.syncVersion,
		PrevVersion:  s.prevVersion,
		TableName:    s.tableName,
	})
	if err != nil {
		log.Error("Error when creating loader: ", err)
		return nil, err
	}
	defer loaderInstance.Close()
	loadResult, err := loaderInstance.Load(ctx, getter)
	if err != nil {
		log.Error("Error when loading data: ", err)
		return nil, err
	}

	// caculate statistic
	log.Debug("Caculating statistic")

	return loadResult, nil
}
