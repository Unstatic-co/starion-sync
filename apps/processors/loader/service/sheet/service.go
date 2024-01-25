package sheet

import (
	"context"
	"loader/pkg/config"
	"loader/service/getter"
	"loader/service/loader"
	"loader/util/s3"
	"os"

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

	// loger
	logger *log.Entry

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

	// logger
	logger := log.New()
	logger.SetOutput(os.Stdout)
	logger.SetFormatter(&log.JSONFormatter{})
	logger.SetLevel(log.DebugLevel)
	loggerEntry := logger.WithFields(log.Fields{
		"dataSourceId": params.DataSourceId,
		"syncVersion":  params.SyncVersion,
	})
	s.logger = loggerEntry

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

func (s *SheetService) Load(ctx context.Context) (*loader.LoadedResult, error) {
	s.logger.Info("Start load data")

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

	// get diff data
	s.logger.Debug("Getting diff data")
	data, err := getter.GetLoadData()
	if err != nil {
		s.logger.Error("Error when getting diff data: ", err)
		return nil, err
	}

	// execute loader
	s.logger.Debug("Executing loader")
	loaderInstance, err := loader.NewDefaultLoader(loader.LoaderParams{
		DataSourceId: s.dataSourceId,
		SyncVersion:  s.syncVersion,
		PrevVersion:  s.prevVersion,
		TableName:    s.tableName,
	})
	if err != nil {
		s.logger.Error("Error when creating loader: ", err)
		return nil, err
	}
	defer loaderInstance.Close()
	err = loaderInstance.Load(ctx, &data)
	if err != nil {
		s.logger.Error("Error when loading data: ", err)
		return nil, err
	}

	// caculate statistic
	s.logger.Debug("Caculating statistic")
	result := loader.LoadedResult{
		AddedRowsCount:   len(data.AddedRows.Rows),
		DeletedRowsCount: len(data.DeletedRows),
		IsSchemaChanged:  loader.IsSchemaChanged(data.SchemaChanges),
	}

	return &result, nil
}
