package service

import (
	"comparer/libs/schema"
	"comparer/pkg/config"
	"comparer/util/s3"
	"context"
	"fmt"
	"os"
	"os/exec"

	jsoniter "github.com/json-iterator/go"
	log "github.com/sirupsen/logrus"
)

type CompareServiceInitParams struct {
	DataSourceId string `json:"dataSourceId"`
	SyncVersion  int    `json:"syncVersion"`
}

type CompareService struct {
	dataSourceId string
	syncVersion  int

	schema schema.TableSchema

	// loger
	logger *log.Entry
}

func NewCompareService(params CompareServiceInitParams) *CompareService {
	logger := log.New()
	logger.SetOutput(os.Stdout)
	// logger.SetFormatter(&log.JSONFormatter{})
	logger.SetLevel(log.DebugLevel)
	loggerEntry := logger.WithFields(log.Fields{
		"dataSourceId": params.DataSourceId,
	})
	return &CompareService{
		dataSourceId: params.DataSourceId,
		syncVersion:  params.SyncVersion,
		logger:       loggerEntry,
	}
}

func (s *CompareService) getS3DataFileLocation(syncVersion int) string {
	return fmt.Sprintf(`%s/%s/data/%s-%d.parquet`, config.AppConfig.S3Url, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3SchemaFileLocation(syncVersion int) string {
	return fmt.Sprintf(`%s/%s/schema/%s-%d.json`, config.AppConfig.S3Url, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3ResultFileLocation(syncVersion int) string {
	return fmt.Sprintf(`%s/%s/result/%s-%d.json`, config.AppConfig.S3Url, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3ResultAddedRowsFileLocation(syncVersion int) string {
	return fmt.Sprintf(`%s/%s/result/%s-%d-addedRows.json`, config.AppConfig.S3Url, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3ResultDeletedRowsFileLocation(syncVersion int) string {
	return fmt.Sprintf(`%s/%s/result/%s-%d-deletedRows.json`, config.AppConfig.S3Url, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}

func (s *CompareService) Compare(ctx context.Context) error {
	log.Info("Running compare for ds " + s.dataSourceId)
	queryContext := QueryContext{
		PrimaryColumn:          schema.HashedPrimaryField,
		PreviousSchema:         s.schema,
		CurrentSchema:          s.schema,
		PreviousDataS3Location: s.getS3DataFileLocation(s.syncVersion),
		CurrentDataS3Location:  s.getS3DataFileLocation(s.syncVersion),
		ResultS3Location:       s.getS3ResultFileLocation(s.syncVersion),
		AddedRowsS3Location:    s.getS3ResultAddedRowsFileLocation(s.syncVersion),
		DeletedRowsS3Location:  s.getS3ResultDeletedRowsFileLocation(s.syncVersion),
	}
	query := queryContext.GetFullCompareQuery()
	log.Debug("Query: " + query)
	cmd := exec.CommandContext(
		ctx,
		"clickhouse",
		"local",
		"-q",
		fmt.Sprintf(`%s`, query),
	)

	outputWriter := s.logger.WriterLevel(log.InfoLevel)
	errorWriter := s.logger.WriterLevel(log.ErrorLevel)
	defer outputWriter.Close()
	defer errorWriter.Close()
	cmd.Stdout = outputWriter
	cmd.Stderr = errorWriter

	if err := cmd.Run(); err != nil {
		return err
	}

	return nil
}

func (s *CompareService) GetSchema(ctx context.Context) error {
	log.Info("Getting schema for ds " + s.dataSourceId)
	appConfig := config.AppConfig
	s3Config := s3.S3HandlerConfig{
		Url:       appConfig.S3Url,
		Region:    appConfig.S3Region,
		Bucket:    appConfig.S3DiffDataBucket,
		AccessKey: appConfig.S3AccessKey,
		SecretKey: appConfig.S3SecretKey,
	}
	handler, err := s3.NewHandlerWithConfig(&s3Config)
	if err != nil {
		log.Error("Error when initializing s3 handler: ", err)
		return err
	}
	schemaFileKey := fmt.Sprintf("schema/%s-%d.json", s.dataSourceId, s.syncVersion)
	schemaFile, err := handler.ReadFileByte(schemaFileKey)
	if err != nil {
		log.Error("Error when reading schema file: ", err)
		return err
	}
	err = jsoniter.Unmarshal(schemaFile, &s.schema)
	if err != nil {
		log.Error("Error when unmarshalling schema file: ", err)
		return err
	}
	return nil
}

func (s *CompareService) Run(ctx context.Context) error {
	err := s.GetSchema(ctx)
	if err != nil {
		return err
	}
	err = s.Compare(ctx)
	if err != nil {
		return err
	}
	return nil
}
