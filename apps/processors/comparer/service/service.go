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
	"github.com/zhenjl/cityhash"
	"golang.org/x/sync/errgroup"
)

type CompareServiceInitParams struct {
	DataSourceId string `json:"dataSourceId"`
	SyncVersion  int    `json:"syncVersion"`
}

type CompareService struct {
	dataSourceId string
	syncVersion  int

	prevSchema schema.TableSchema
	curSchema  schema.TableSchema

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
func (s *CompareService) getS3ResultDeletedFieldsFileLocation(syncVersion int) string {
	return fmt.Sprintf(`%s/%s/result/%s-%d-deletedFields.json`, config.AppConfig.S3Url, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3ResultUpdatedFieldsFileLocation(syncVersion int) string {
	return fmt.Sprintf(`%s/%s/result/%s-%d-updatedFields.json`, config.AppConfig.S3Url, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}

func (s *CompareService) CompareData(ctx context.Context) error {
	log.Info("Running compare for ds " + s.dataSourceId)

	queryContext := QueryContext{
		PrimaryColumn:           schema.HashedPrimaryField,
		PreviousSchema:          s.prevSchema,
		CurrentSchema:           s.curSchema,
		PreviousDataS3Location:  s.getS3DataFileLocation(s.syncVersion - 1),
		CurrentDataS3Location:   s.getS3DataFileLocation(s.syncVersion),
		ResultS3Location:        s.getS3ResultFileLocation(s.syncVersion),
		AddedRowsS3Location:     s.getS3ResultAddedRowsFileLocation(s.syncVersion),
		DeletedRowsS3Location:   s.getS3ResultDeletedRowsFileLocation(s.syncVersion),
		DeletedFieldsS3Location: s.getS3ResultDeletedFieldsFileLocation(s.syncVersion),
		UpdatedFieldsS3Location: s.getS3ResultUpdatedFieldsFileLocation(s.syncVersion),
	}
	queryContext.Setup()
	query := queryContext.GetFullCompareQuery()

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

func (s *CompareService) CompareSchema(ctx context.Context) error {
	log.Info("Running compare schema for ds" + s.dataSourceId)

	deletedFields := make([]string, 0)
	addedFields := make(map[string]schema.FieldSchema)
	updatedFields := make(map[string]schema.FieldSchema)

	prevFields := make(map[string]schema.FieldSchema)
	curFields := make(map[string]schema.FieldSchema)

	fieldsMap := make(map[string]int)

	// 1 = delete, 2 = update, 3 = add
	for fieldName, field := range s.prevSchema {
		prevFields[fieldName] = field
		fieldsMap[fieldName] = 1
	}
	for fieldName, field := range s.curSchema {
		curFields[fieldName] = field
		if _, ok := fieldsMap[fieldName]; !ok {
			fieldsMap[fieldName] = 3
		} else {
			fieldsMap[fieldName] = 2
		}
	}
	for fieldName, operation := range fieldsMap {
		if operation == 1 {
			// field is deleted
			deletedFields = append(deletedFields, fieldName)
		} else if operation == 3 {
			// field is added
			addedFields[fieldName] = curFields[fieldName]
		} else {
			// field may be updated, compare field
			marshaledPrevField, err := jsoniter.Marshal(prevFields[fieldName])
			if err != nil {
				return fmt.Errorf("Error when marshalling prev field: %+v", err)
			}
			marshaledCurField, err := jsoniter.Marshal(curFields[fieldName])
			if err != nil {
				return fmt.Errorf("Error when marshalling cur field: %+v", err)
			}
			if cityhash.CityHash64(marshaledPrevField, uint32(len(marshaledPrevField))) != cityhash.CityHash64(marshaledCurField, uint32(len(marshaledCurField))) {
				updatedFields[fieldName] = curFields[fieldName]
			}
		}

	}

	var schemaDiffResult struct {
		DeletedFields []string                      `json:"deletedFields"`
		AddedFields   map[string]schema.FieldSchema `json:"addedFields"`
		UpdatedFields map[string]schema.FieldSchema `json:"updatedFields"`
	}
	schemaDiffResult.DeletedFields = deletedFields
	schemaDiffResult.AddedFields = addedFields
	schemaDiffResult.UpdatedFields = updatedFields

	schemaDiffResultBytes, err := jsoniter.Marshal(schemaDiffResult)
	if err != nil {
		return fmt.Errorf("Error when marshalling schema diff result: %+v", err)
	}

	handler, err := s3.NewHandlerWithConfig(&s3.S3HandlerConfig{
		Url:       config.AppConfig.S3Url,
		Region:    config.AppConfig.S3Region,
		Bucket:    config.AppConfig.S3DiffDataBucket,
		AccessKey: config.AppConfig.S3AccessKey,
		SecretKey: config.AppConfig.S3SecretKey,
	})
	if err != nil {
		return fmt.Errorf("Error when initializing s3 handler: %+v", err)
	}
	schemaDiffResultFileKey := fmt.Sprintf("result/%s-%d-schema.json", s.dataSourceId, s.syncVersion)
	return handler.UploadFileWithBytes(schemaDiffResultFileKey, schemaDiffResultBytes)
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
	err = jsoniter.Unmarshal(schemaFile, &s.curSchema)
	if err != nil {
		log.Error("Error when unmarshalling schema file: ", err)
		return err
	}
	// get previous schema
	if s.syncVersion > 1 {
		prevSchemaFileKey := fmt.Sprintf("schema/%s-%d.json", s.dataSourceId, s.syncVersion-1)
		schemaFile, err := handler.ReadFileByte(prevSchemaFileKey)
		if err != nil {
			log.Error("Error when reading schema file: ", err)
			return err
		}
		err = jsoniter.Unmarshal(schemaFile, &s.prevSchema)
		if err != nil {
			log.Error("Error when unmarshalling schema file: ", err)
			return err
		}
	}
	return nil
}

func (s *CompareService) Run(ctx context.Context) error {
	err := s.GetSchema(ctx)
	if err != nil {
		return err
	}

	group, subctx := errgroup.WithContext(ctx)
	group.Go(func() error {
		return s.CompareSchema(subctx)
	})
	group.Go(func() error {
		return s.CompareData(subctx)
	})

	if err := group.Wait(); err != nil {
		return err
	}

	return nil
}
