package getter

import (
	"context"
	"fmt"
	sch "loader/libs/schema"
	"loader/pkg/config"
	"loader/service"
	"loader/service/loader"
	"loader/util/s3"

	jsoniter "github.com/json-iterator/go"
	"github.com/samber/lo"
	log "github.com/sirupsen/logrus"
	"golang.org/x/sync/errgroup"
)

type GetterInitParams struct {
	DataSourceId string      `json:"dataSourceId"`
	SyncVersion  uint        `json:"syncVersion"`
	PrevVersion  uint        `json:"prevVersion"`
	Metadata    interface{} `json:"metadata"`
}

type Getter struct {
	// info
	dataSourceId string
	syncVersion  uint
	prevVersion  uint
	metadata     interface{}

	// s3
	s3DiffDataHandler *s3.S3Handler
}

func NewGetter(params GetterInitParams) (*Getter, error) {
	var g Getter
	g.dataSourceId = params.DataSourceId
	g.syncVersion = params.SyncVersion
	g.prevVersion = params.PrevVersion

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
	g.s3DiffDataHandler = handler

	return &g, nil
}

func (g *Getter) getS3ResultAddedRowsFileKey() string {
	return fmt.Sprintf(`result/%s-%d-addedRows.json`, g.dataSourceId, g.syncVersion)
}
func (g *Getter) getS3ResultDeletedRowsFileKey() string {
	return fmt.Sprintf(`result/%s-%d-deletedRows.json`, g.dataSourceId, g.syncVersion)
}
func (g *Getter) getS3ResultDeletedFieldsFileKey() string {
	return fmt.Sprintf(`result/%s-%d-deletedFields.json`, g.dataSourceId, g.syncVersion)
}
func (g *Getter) getS3ResultUpdatedFieldsFileKey() string {
	return fmt.Sprintf(`result/%s-%d-updatedFields.json`, g.dataSourceId, g.syncVersion)
}
func (g *Getter) getS3ResultAddedFieldsFileKey() string {
	return fmt.Sprintf(`result/%s-%d-addedFields.json`, g.dataSourceId, g.syncVersion)
}
func (g *Getter) getS3ResultSchemaFileKey() string {
	return fmt.Sprintf(`result/%s-%d-schema.json`, g.dataSourceId, g.syncVersion)
}

func (g *Getter) GetSchema() (sch.TableSchema, error) {
	log.Info("Getting schema")
	var schema sch.TableSchema
	schemaFileKey := fmt.Sprintf("schema/%s-%d.json", g.dataSourceId, g.syncVersion)
	schemaFile, err := g.s3DiffDataHandler.ReadFileByte(schemaFileKey)
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

func (g *Getter) GetLoadData() (loader.LoaderData, error) {
	log.Info("Start getting diff data")

	var data loader.LoaderData

	ctx := context.Background()
	group, _ := errgroup.WithContext(ctx)

	// get schema
	group.Go(func() error {
		schema, err := g.GetSchema()
		if err != nil {
			log.Error("Error when getting schema: ", err)
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
		var addedRows service.DiffResult
		addedRowsFile, err := g.s3DiffDataHandler.ReadFileByte(g.getS3ResultAddedRowsFileKey())
		if err != nil {
			log.Error("Error when reading added rows file: ", err)
			return err
		}
		err = jsoniter.Unmarshal(addedRowsFile, &addedRows)
		if err != nil {
			log.Error("Error when unmarshal added rows file: ", err)
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

	if g.prevVersion != 0 {
		// get schema diff
		group.Go(func() error {
			var schemaDiff service.SchemaDiffResult
			schemaDiffFile, err := g.s3DiffDataHandler.ReadFileByte(g.getS3ResultSchemaFileKey())
			if err != nil {
				log.Error("Error when reading schema diff file: ", err)
				return err
			}
			err = jsoniter.Unmarshal(schemaDiffFile, &schemaDiff)
			if err != nil {
				log.Error("Error when unmarshal schema diff file: ", err)
				return err
			}
			data.SchemaChanges = schemaDiff
			return nil
		})

		// get deleted rows
		group.Go(func() error {
			var deletedRows service.DiffResult
			deletedRowsFile, err := g.s3DiffDataHandler.ReadFileByte(g.getS3ResultDeletedRowsFileKey())
			if err != nil {
				log.Error("Error when reading added rows file: ", err)
				return err
			}
			err = jsoniter.Unmarshal(deletedRowsFile, &deletedRows)
			if err != nil {
				log.Error("Error when unmarshal added rows file: ", err)
				return err
			}
			data.DeletedRows = lo.Map(deletedRows.Data, func(row []interface{}, _ int) string {
				return row[0].(string)
			})

			return nil
		})

		// get update fields
		group.Go(func() error {
			var updatedFields service.DiffResult
			updatedFieldsFile, err := g.s3DiffDataHandler.ReadFileByte(g.getS3ResultUpdatedFieldsFileKey())
			if err != nil {
				log.Error("Error when reading updated fields file: ", err)
				return err
			}
			err = jsoniter.Unmarshal(updatedFieldsFile, &updatedFields)
			if err != nil {
				log.Error("Error when unmarshal updated fields file: ", err)
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
			var addedFields service.DiffResult
			addedFieldsFile, err := g.s3DiffDataHandler.ReadFileByte(g.getS3ResultAddedFieldsFileKey())
			if err != nil {
				log.Error("Error when reading added fields file: ", err)
				return err
			}
			err = jsoniter.Unmarshal(addedFieldsFile, &addedFields)
			if err != nil {
				log.Error("Error when unmarshal added fields file: ", err)
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
			var deletedFields service.DiffResult
			deletedFieldsFile, err := g.s3DiffDataHandler.ReadFileByte(g.getS3ResultDeletedFieldsFileKey())
			if err != nil {
				log.Error("Error when reading deleted fields file: ", err)
				return err
			}
			err = jsoniter.Unmarshal(deletedFieldsFile, &deletedFields)
			if err != nil {
				log.Error("Error when unmarshal deleted fields file: ", err)
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

	if g.prevVersion == 0 && g.metadata != nil {
		data.Metadata = g.metadata
	}

	if err := group.Wait(); err != nil {
		return data, err
	}

	log.Info("Finish getting diff data")

	return data, nil
}
