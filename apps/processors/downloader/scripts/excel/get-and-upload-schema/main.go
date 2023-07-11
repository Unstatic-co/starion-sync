package main

import (
	exceltype "downloader/libs/datatype/excel"
	"downloader/libs/schema"
	"downloader/util"
	"downloader/util/s3"
	"flag"
	"fmt"
	"log"
	"os"

	jsoniter "github.com/json-iterator/go"
	"github.com/samber/lo"
	jsonschema "github.com/santhosh-tekuri/jsonschema/v5"
)

func getSchemaFromJsonSchemaFile(filePath string) schema.TableSchema {
	file, err := os.Open(filePath)
	if err != nil {
		log.Fatalf("Cannot open schema file %s\n", filePath)
	}
	defer file.Close()
	compiler := jsonschema.NewCompiler()
	url := "schema.json"

	if err := compiler.AddResource(url, file); err != nil {
		log.Fatalf("Error when parsing schema: %+v\n", err)
	}
	_baseSchema, err := compiler.Compile(url)
	if err != nil {
		log.Fatalf("Error when parsing schema: %+v\n", err)
	}

	tableSchema := make(schema.TableSchema)

	for fieldName, property := range _baseSchema.Properties {
		var fieldSchema schema.FieldSchema
		hashedFieldName := util.GetMD5Hash(fieldName)

		// If field is primary key
		if hashedFieldName == schema.HashedPrimaryField {
			fieldSchema = schema.FieldSchema{
				Name:         schema.PrimaryFieldName,
				Type:         schema.String,
				OriginalType: string(exceltype.String),
				Nullable:     false,
				Primary:      true,
			}
		} else {
			fieldTypeList := property.Types
			format := property.Format
			if len(fieldTypeList) == 0 {
				continue
			}
			fieldType := fieldTypeList[0]
			var detectedType schema.DataType

			switch fieldType {
			case "string":
				switch format {
				case "date-time":
					detectedType = schema.DateTime
				case "date":
					detectedType = schema.DateTime
				default:
					detectedType = schema.String
				}
			case "null":
				// If column does not have data
				log.Printf("Field %s has unprocessable data type `null`, using string datatype to sync...\n", fieldName)
				detectedType = schema.String
			case "integer":
				detectedType = schema.Number
			case "number":
				detectedType = schema.Number
			case "array":
				log.Fatalf(
					"Encountered unsupported type: %s (with detected subtype %+v)\n",
					fieldType,
					property.Items,
				)
			case "object":
				log.Fatalf(
					"Encountered unsupported type: %s (with detected subtype %+v)\n",
					fieldType,
					property.Properties,
				)
			default:
				log.Fatalf("Unknown data type: %s", fieldType)
			}

			// qsv does not comply with `--enum-threshold`, so we must filter enum length in client
			enum := lo.Filter(property.Enum, func(item any, _ int) bool { return item != "" && item != nil })

			var fieldEnum []any
			if len(enum) <= 5 {
				fieldEnum = enum
			} else {
				fieldEnum = []any{}
			}

			fieldSchema = schema.FieldSchema{
				Name:         fieldName,
				Type:         detectedType,
				OriginalType: string(detectedType),
				Nullable:     true,
				Enum:         fieldEnum,
			}

		}

		tableSchema[hashedFieldName] = fieldSchema
	}

	return tableSchema
}

func uploadSchema(schema schema.TableSchema, s3Config s3.S3HandlerConfig, dataSourceId string, syncVersion string) error {
	schemaJson, err := jsoniter.Marshal(schema)
	if err != nil {
		log.Fatalf("Error when marshalling schema: %+v\n", err)
	}
	handler, err := s3.NewHandlerWithConfig(&s3Config)
	if err != nil {
		log.Fatalf("Error when initializing s3 handler: %+v\n", err)
	}
	log.Println("Uploading schema to s3...")
	schemaFileKey := fmt.Sprintf("schema/%s-%s.json", dataSourceId, syncVersion)
	return handler.UploadFileWithBytes(schemaFileKey, schemaJson)
}

func main() {
	schemaFile := flag.String("schemaFile", "", "schema")
	s3Url := flag.String("s3Url", "", "s3 url")
	s3Region := flag.String("s3Region", "", "s3 region")
	s3Bucket := flag.String("s3Bucket", "", "s3 bucket")
	s3AccessKey := flag.String("s3AccessKey", "", "s3 access key")
	s3SecretKey := flag.String("s3SecretKey", "", "s3 secret key")
	dataSourceId := flag.String("dataSourceId", "", "data source id")
	syncVersion := flag.String("syncVersion", "", "sync version")

	flag.Parse()

	schema := getSchemaFromJsonSchemaFile(*schemaFile)
	err := uploadSchema(
		schema,
		s3.S3HandlerConfig{
			Url:       *s3Url,
			Region:    *s3Region,
			Bucket:    *s3Bucket,
			AccessKey: *s3AccessKey,
			SecretKey: *s3SecretKey,
		},
		*dataSourceId,
		*syncVersion,
	)
	if err != nil {
		log.Fatalf("Error when uploading schema: %+v\n", err)
	}
}
