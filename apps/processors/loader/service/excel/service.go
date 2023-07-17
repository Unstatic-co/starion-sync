package excel

import (
	"context"
	"fmt"
	"loader/pkg/config"
	"loader/service/loader"
	"loader/util/s3"
	"os"

	jsoniter "github.com/json-iterator/go"
	log "github.com/sirupsen/logrus"
)

type MicrosoftExcelServiceInitParams struct {
	DataSourceId string `json:"dataSourceId"`
	SyncVersion  int    `json:"syncVersion"`
}

type MicrosoftExcelService struct {
	// info
	syncflowId   string
	dataSourceId string
	syncVersion  int

	// loger
	logger *log.Entry

	// s3
	s3DiffDataHandler *s3.S3Handler
}

func NewService(params MicrosoftExcelServiceInitParams) (*MicrosoftExcelService, error) {
	var s MicrosoftExcelService
	s.dataSourceId = params.DataSourceId
	s.syncVersion = params.SyncVersion

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
		Url:       config.AppConfig.S3Url,
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

func (s *MicrosoftExcelService) getS3ResultAddedRowsFileKey() string {
	return fmt.Sprintf(`result/%s-%d-addedRows.json`, s.dataSourceId, s.syncVersion)
}
func (s *MicrosoftExcelService) getS3ResultDeletedRowsFileKey() string {
	return fmt.Sprintf(`result/%s-%d-deletedRows.json`, s.dataSourceId, s.syncVersion)
}
func (s *MicrosoftExcelService) getS3ResultDeletedFieldsFileKey() string {
	return fmt.Sprintf(`esult/%s-%d-deletedFields.json`, s.dataSourceId, s.syncVersion)
}
func (s *MicrosoftExcelService) getS3ResultUpdatedFieldsFileKey() string {
	return fmt.Sprintf(`result/%s-%d-updatedFields.json`, s.dataSourceId, s.syncVersion)
}
func (s *MicrosoftExcelService) getS3ResultAddedFieldsFileKey() string {
	return fmt.Sprintf(`result/%s-%d-addedFields.json`, s.dataSourceId, s.syncVersion)
}

func (s *MicrosoftExcelService) Load(ctx context.Context) error {
	s.logger.Info("Start load data from excel")

	if s.syncVersion == 1 {
		// get diff result
		s.logger.Debug("Getting diff result")
		var addedRows DiffResult
		addedRowsFile, err := s.s3DiffDataHandler.ReadFileByte(s.getS3ResultAddedRowsFileKey())
		if err != nil {
			s.logger.Error("Error when reading added rows file: ", err)
			return err
		}
		err = jsoniter.Unmarshal(addedRowsFile, &addedRows)
		if err != nil {
			s.logger.Error("Error when unmarshal added rows file: ", err)
			return err
		}

		// prepare data
		s.logger.Debug("Preparing data")
		var data loader.LoaderData
		var addedRowsData loader.AddedRowsData
		for _, field := range addedRows.Meta {
			addedRowsData.Fields = append(addedRowsData.Fields, field.Name)
		}
		addedRowsData.Rows = addedRows.Data

		data.AddedRows = addedRowsData

		// execute loader
		s.logger.Debug("Executing loader")
		loader, err := loader.NewDefaultLoader(s.dataSourceId, s.syncVersion)
		if err != nil {
			s.logger.Error("Error when creating loader: ", err)
			return err
		}
		defer loader.Close()
		err = loader.Load(&data)
		if err != nil {
			s.logger.Error("Error when loading data: ", err)
			return err
		}
	}

	return nil
}
