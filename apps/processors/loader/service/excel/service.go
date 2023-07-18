package excel

import (
	"context"
	"fmt"
	sch "loader/libs/schema"
	"loader/pkg/config"
	"loader/service"
	"loader/service/loader"
	"loader/util/s3"
	"os"

	jsoniter "github.com/json-iterator/go"
	"github.com/samber/lo"
	log "github.com/sirupsen/logrus"
	"golang.org/x/sync/errgroup"
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
	return fmt.Sprintf(`result/%s-%d-deletedFields.json`, s.dataSourceId, s.syncVersion)
}
func (s *MicrosoftExcelService) getS3ResultUpdatedFieldsFileKey() string {
	return fmt.Sprintf(`result/%s-%d-updatedFields.json`, s.dataSourceId, s.syncVersion)
}
func (s *MicrosoftExcelService) getS3ResultAddedFieldsFileKey() string {
	return fmt.Sprintf(`result/%s-%d-addedFields.json`, s.dataSourceId, s.syncVersion)
}
func (s *MicrosoftExcelService) getS3ResultSchemaFileKey() string {
	return fmt.Sprintf(`result/%s-%d-schema.json`, s.dataSourceId, s.syncVersion)
}

func (s *MicrosoftExcelService) GetSchema() (sch.TableSchema, error) {
	s.logger.Info("Getting schema")
	var schema sch.TableSchema
	schemaFileKey := fmt.Sprintf("schema/%s-%d.json", s.dataSourceId, s.syncVersion)
	schemaFile, err := s.s3DiffDataHandler.ReadFileByte(schemaFileKey)
	if err != nil {
		log.Error("Error when reading schema file: ", err)
		return nil, err
	}
	err = jsoniter.Unmarshal(schemaFile, &schema)
	if err != nil {
		log.Error("Error when unmarshalling schema file: ", err)
		return nil, err
	}
	return schema, nil
}

func (s *MicrosoftExcelService) GetDiffData() (loader.LoaderData, error) {
	s.logger.Info("Start getting diff data")

	var data loader.LoaderData

	ctx := context.Background()
	group, _ := errgroup.WithContext(ctx)

	// get schema
	group.Go(func() error {
		schema, err := s.GetSchema()
		if err != nil {
			s.logger.Error("Error when getting schema: ", err)
			return err
		}
		data.Schema = schema
		// find primary field
		primaryField, _ := lo.FindKeyBy(schema, func(k string, v sch.FieldSchema) bool {
			return v.Primary
		})
		data.PrimaryField = primaryField

		return nil
	})

	// get added rows
	group.Go(func() error {
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
		var addedRowsData loader.AddedRowsData
		for _, field := range addedRows.Meta {
			addedRowsData.Fields = append(addedRowsData.Fields, field.Name)
		}
		addedRowsData.Rows = addedRows.Data
		data.AddedRows = addedRowsData
		return nil
	})

	if s.syncVersion > 1 {
		// get schema diff
		group.Go(func() error {
			var schemaDiff service.SchemaDiffResult
			schemaDiffFile, err := s.s3DiffDataHandler.ReadFileByte(s.getS3ResultSchemaFileKey())
			if err != nil {
				s.logger.Error("Error when reading schema diff file: ", err)
				return err
			}
			err = jsoniter.Unmarshal(schemaDiffFile, &schemaDiff)
			if err != nil {
				s.logger.Error("Error when unmarshal schema diff file: ", err)
				return err
			}
			data.SchemaChanges = schemaDiff
			return nil
		})

		// get deleted rows
		group.Go(func() error {
			var deletedRows DiffResult
			deletedRowsFile, err := s.s3DiffDataHandler.ReadFileByte(s.getS3ResultDeletedRowsFileKey())
			if err != nil {
				s.logger.Error("Error when reading added rows file: ", err)
				return err
			}
			err = jsoniter.Unmarshal(deletedRowsFile, &deletedRows)
			if err != nil {
				s.logger.Error("Error when unmarshal added rows file: ", err)
				return err
			}
			data.DeletedRows = lo.Map(deletedRows.Data, func(row []interface{}, _ int) string {
				return row[0].(string)
			})

			return nil
		})

		// get update fields
		group.Go(func() error {
			var updatedFields DiffResult
			updatedFieldsFile, err := s.s3DiffDataHandler.ReadFileByte(s.getS3ResultUpdatedFieldsFileKey())
			if err != nil {
				s.logger.Error("Error when reading updated fields file: ", err)
				return err
			}
			err = jsoniter.Unmarshal(updatedFieldsFile, &updatedFields)
			if err != nil {
				s.logger.Error("Error when unmarshal updated fields file: ", err)
				return err
			}
			updatedFieldsData := make(map[string]map[string]interface{}, len(updatedFields.Data))
			for _, rowData := range updatedFields.Data {
				rowId := rowData[0].(string)
				updateDataString := rowData[1].(string)
				updateData := make(map[string]interface{})
				err := jsoniter.UnmarshalFromString(updateDataString, &updateData)
				if err != nil {
					return err
				}
				if len(updateData) == 0 {
					continue
				}
				updatedFieldsData[rowId] = updateData
			}

			data.UpdatedFields = updatedFieldsData

			return nil
		})

		// get added fields
		group.Go(func() error {
			var addedFields DiffResult
			addedFieldsFile, err := s.s3DiffDataHandler.ReadFileByte(s.getS3ResultAddedFieldsFileKey())
			if err != nil {
				s.logger.Error("Error when reading added fields file: ", err)
				return err
			}
			err = jsoniter.Unmarshal(addedFieldsFile, &addedFields)
			if err != nil {
				s.logger.Error("Error when unmarshal added fields file: ", err)
				return err
			}
			addedFieldsData := make(map[string]map[string]interface{}, len(addedFields.Data))
			for _, rowData := range addedFields.Data {
				rowId := rowData[0].(string)
				addDataString := rowData[1].(string)
				addData := make(map[string]interface{})
				err := jsoniter.UnmarshalFromString(addDataString, &addData)
				if err != nil {
					return err
				}
				if len(addData) == 0 {
					continue
				}
				addedFieldsData[rowId] = addData
			}

			data.AddedFields = addedFieldsData

			return nil
		})

		// get deleted fields
		group.Go(func() error {
			var deletedFields DiffResult
			deletedFieldsFile, err := s.s3DiffDataHandler.ReadFileByte(s.getS3ResultDeletedFieldsFileKey())
			if err != nil {
				s.logger.Error("Error when reading deleted fields file: ", err)
				return err
			}
			err = jsoniter.Unmarshal(deletedFieldsFile, &deletedFields)
			if err != nil {
				s.logger.Error("Error when unmarshal deleted fields file: ", err)
				return err
			}
			deletedFieldsData := make(map[string][]string, len(deletedFields.Data))
			for _, rowData := range deletedFields.Data {
				rowId := rowData[0].(string)
				deletedFields := rowData[1].([]interface{})
				deletedFieldsCastedString := make([]string, len(deletedFields))
				for i, field := range deletedFields {
					deletedFieldsCastedString[i] = field.(string)
				}
				deletedFieldsData[rowId] = deletedFieldsCastedString
			}

			data.DeletedFields = deletedFieldsData

			return nil
		})
	}

	if err := group.Wait(); err != nil {
		return data, err
	}

	s.logger.Info("Finish getting diff data")

	return data, nil
}

func (s *MicrosoftExcelService) Load(ctx context.Context) error {
	s.logger.Info("Start load data from excel")

	// get diff data
	s.logger.Debug("Getting diff data")
	data, err := s.GetDiffData()
	if err != nil {
		s.logger.Error("Error when getting diff data: ", err)
		return err
	}

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

	return nil
}
