package excel

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
)

type CompareSchemaResult struct {
	DeletedFields     []string                      `json:"deletedFields"`
	AddedFields       map[string]schema.FieldSchema `json:"addedFields"`
	UpdatedFields     map[string]schema.FieldSchema `json:"updatedFields"`
	UpdatedTypeFields map[string]schema.DataType    `json:"updatedTypeFields"`
	KeptFields        map[string]schema.FieldSchema `json:"keptFields"`
}

type CompareServiceInitParams struct {
	DataSourceId string `json:"dataSourceId"`
	SyncVersion  uint   `json:"syncVersion"`
	PrevVersion  uint   `json:"prevSyncVersion"`
}

type CompareService struct {
	dataSourceId string
	syncVersion  uint
	prevVersion  uint

	prevSchema schema.TableSchema
	curSchema  schema.TableSchema

	// result
	compareSchemaResult CompareSchemaResult

	// loger
	logger *log.Entry
}

func New(params CompareServiceInitParams) *CompareService {
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
		prevVersion:  params.PrevVersion,
		logger:       loggerEntry,
	}
}

func (s *CompareService) getS3DataFileLocation(syncVersion uint) string {
	return fmt.Sprintf(`%s/%s/data/%s-%d.parquet`, config.AppConfig.S3Endpoint, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3SchemaFileLocation(syncVersion uint) string {
	return fmt.Sprintf(`%s/%s/schema/%s-%d.json`, config.AppConfig.S3Endpoint, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3ResultFileLocation(syncVersion uint) string {
	return fmt.Sprintf(`%s/%s/result/%s-%d.json`, config.AppConfig.S3Endpoint, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3ResultAddedRowsFileLocation(syncVersion uint) string {
	return fmt.Sprintf(`%s/%s/result/%s-%d-addedRows.json`, config.AppConfig.S3Endpoint, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3ResultDeletedRowsFileLocation(syncVersion uint) string {
	return fmt.Sprintf(`%s/%s/result/%s-%d-deletedRows.json`, config.AppConfig.S3Endpoint, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3ResultDeletedFieldsFileLocation(syncVersion uint) string {
	return fmt.Sprintf(`%s/%s/result/%s-%d-deletedFields.json`, config.AppConfig.S3Endpoint, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3ResultUpdatedFieldsFileLocation(syncVersion uint) string {
	return fmt.Sprintf(`%s/%s/result/%s-%d-updatedFields.json`, config.AppConfig.S3Endpoint, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}
func (s *CompareService) getS3ResultAddedFieldsFileLocation(syncVersion uint) string {
	return fmt.Sprintf(`%s/%s/result/%s-%d-addedFields.json`, config.AppConfig.S3Endpoint, config.AppConfig.S3DiffDataBucket, s.dataSourceId, syncVersion)
}

func (s *CompareService) CompareData(ctx context.Context) error {
	log.Info("Running compare for ds " + s.dataSourceId)

	queryContext := QueryContext{
		PrimaryColumn:  schema.HashedPrimaryField,
		PreviousSchema: s.prevSchema,
		CurrentSchema:  s.curSchema,

		CompareSchemaResult: s.compareSchemaResult,

		PreviousDataS3Location:  s.getS3DataFileLocation(s.prevVersion),
		CurrentDataS3Location:   s.getS3DataFileLocation(s.syncVersion),
		AddedRowsS3Location:     s.getS3ResultAddedRowsFileLocation(s.syncVersion),
		DeletedRowsS3Location:   s.getS3ResultDeletedRowsFileLocation(s.syncVersion),
		DeletedFieldsS3Location: s.getS3ResultDeletedFieldsFileLocation(s.syncVersion),
		UpdatedFieldsS3Location: s.getS3ResultUpdatedFieldsFileLocation(s.syncVersion),
		AddedFieldsS3Location:   s.getS3ResultAddedFieldsFileLocation(s.syncVersion),
	}
	queryContext.Setup()

	var query string
	if s.prevVersion == 0 {
		query = queryContext.GetFirstVersionCompareQuery()
	} else {
		query = queryContext.GetFullCompareQuery()
	}
	log.Debug("Query: " + query)

	cmd := exec.CommandContext(
		ctx,
		"clickhouse",
		"local",
		"-q",
		"--multiquery",
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
	updatedTypeFields := make(map[string]schema.DataType)
	keptFields := make(map[string]schema.FieldSchema)

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
			prevField := prevFields[fieldName]
			curField := curFields[fieldName]
			// field may be updated, compare field
			marshaledPrevField, err := jsoniter.Marshal(prevField)
			if err != nil {
				return fmt.Errorf("Error when marshalling prev field: %+v", err)
			}
			marshaledCurField, err := jsoniter.Marshal(curField)
			if err != nil {
				return fmt.Errorf("Error when marshalling cur field: %+v", err)
			}
			if cityhash.CityHash64(marshaledPrevField, uint32(len(marshaledPrevField))) != cityhash.CityHash64(marshaledCurField, uint32(len(marshaledCurField))) {
				updatedFields[fieldName] = curField
				if prevField.Type != curField.Type {
					updatedTypeFields[fieldName] = curField.Type
				}
			} else {
				keptFields[fieldName] = curFields[fieldName]
			}
		}

	}

	s.compareSchemaResult = CompareSchemaResult{
		DeletedFields:     deletedFields,
		AddedFields:       addedFields,
		UpdatedFields:     updatedFields,
		UpdatedTypeFields: updatedTypeFields,
		KeptFields:        keptFields,
	}

	schemaDiffResultBytes, err := jsoniter.Marshal(s.compareSchemaResult)
	if err != nil {
		return fmt.Errorf("Error when marshalling schema diff result: %+v", err)
	}

	handler, err := s3.NewHandlerWithConfig(&s3.S3HandlerConfig{
		Endpoint:  config.AppConfig.S3Endpoint,
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
		Endpoint:  appConfig.S3Endpoint,
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
		prevSchemaFileKey := fmt.Sprintf("schema/%s-%d.json", s.dataSourceId, s.prevVersion)
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

	if s.syncVersion != 1 {
		err = s.CompareSchema(ctx)
		if err != nil {
			return err
		}
	}

	err = s.CompareData(ctx)
	if err != nil {
		return err
	}

	return nil
}
