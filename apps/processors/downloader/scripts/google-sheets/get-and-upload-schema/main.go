package main

import (
	exceltype "downloader/libs/datatype/excel"
	"downloader/libs/schema"
	"downloader/util"
	"downloader/util/s3"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"strings"

	jsoniter "github.com/json-iterator/go"
	"github.com/samber/lo"
	jsonschema "github.com/santhosh-tekuri/jsonschema/v5"
)

func inferBooleanType(enum []interface{}) bool {
	if len(enum) != 2 {
		return false
	}

	enumStr := make([]string, len(enum))
	for i, v := range enum {
		if str, ok := v.(string); ok {
			enumStr[i] = str
		} else {
			// If enum contains non-string value, return false
			return false
		}
	}

	if (lo.Contains(enumStr, "true") && lo.Contains(enumStr, "false") || (lo.Contains(enumStr, "True") && lo.Contains(enumStr, "False"))) || (lo.Contains(enumStr, "TRUE") && lo.Contains(enumStr, "FALSE")) {
		return true
	}
	return false
}

func getSchemaFromJsonSchemaFile(filePath string) (schema.TableSchema, []string) {
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
	nullBecomeStringFields := make([]string, 0)

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

			// qsv does not comply with `--enum-threshold`, so we must filter enum length in client
			enum := lo.Filter(property.Enum, func(item any, _ int) bool { return item != "" && item != nil })

			var detectedType schema.DataType
			var originalType exceltype.ExcelDataType

			switch fieldType {
			case "string":
				switch format {
				case "date-time":
					detectedType = schema.Date
					originalType = exceltype.Number
				case "date":
					detectedType = schema.Date
					originalType = exceltype.Number
				default:
					// detect enum
					if inferBooleanType(enum) {
						detectedType = schema.Boolean
						originalType = exceltype.Logical
						enum = []interface{}{true, false}
					} else {
						detectedType = schema.String
						originalType = exceltype.String
					}
				}
			case "null":
				// If column does not have data
				log.Printf("Field %s has unprocessable data type `null`, using string datatype to sync...\n", fieldName)
				detectedType = schema.String
				originalType = exceltype.String
				nullBecomeStringFields = append(nullBecomeStringFields, hashedFieldName)
			case "integer":
				detectedType = schema.Number
				originalType = exceltype.Number
			case "number":
				detectedType = schema.Number
				originalType = exceltype.Number
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

			var fieldEnum []any
			if len(enum) <= 5 && len(enum) > 0 {
				fieldEnum = enum
			} else {
				fieldEnum = nil
			}

			fieldSchema = schema.FieldSchema{
				Name:         fieldName,
				Type:         detectedType,
				OriginalType: string(originalType),
				Nullable:     true,
				Enum:         fieldEnum,
			}

		}

		tableSchema[hashedFieldName] = fieldSchema
	}

	return tableSchema, nullBecomeStringFields
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
	saveNullBecomeStringFields := flag.String("saveNullBecomeStringFields", "", "save null become string (empty columns) fields to path")

	flag.Parse()

	schema, nullBecomeStringFields := getSchemaFromJsonSchemaFile(*schemaFile)
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

	if *saveNullBecomeStringFields != "" && len(nullBecomeStringFields) > 0 {
		err := ioutil.WriteFile(*saveNullBecomeStringFields, []byte(strings.Join(nullBecomeStringFields, ",")), 0644)
		if err != nil {
			fmt.Printf("Error writing null fields to file: %v\n", err)
			return
		}
	}
}
