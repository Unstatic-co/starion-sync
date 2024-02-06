package main

import (
	exceltype "downloader/libs/datatype/excel"
	"downloader/libs/schema"
	"downloader/util"
	"downloader/util/s3"
	"encoding/csv"
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"
	"sync"

	jsoniter "github.com/json-iterator/go"
	"github.com/samber/lo"
	jsonschema "github.com/santhosh-tekuri/jsonschema/v5"
)

const defaultDateErrorValue = "2001-01-12T18:13:13.000Z"
const defaultErrorValue = "__Error"
const enumThreshold = 5

var duckDbTypeMap = map[schema.DataType]string{
	schema.String:  "VARCHAR",
	schema.Number:  "DOUBLE",
	schema.Date:    "VARCHAR",
	schema.Boolean: "BOOLEAN",
}

var cacheStringToNumber = make(map[string]interface{})

func convertStringNumberToNumberType(stringNumber string) interface{} {
	// log.Printf("Converting string number %s to number type...\n", stringNumber)
	if stringNumber == "" {
		return nil
	} else if _, ok := cacheStringToNumber[stringNumber]; ok {
		// log.Println("Cache hit")
		return cacheStringToNumber[stringNumber]
	} else if intValue, err := strconv.Atoi(stringNumber); err == nil {
		cacheStringToNumber[stringNumber] = intValue
		return intValue
	} else {
		// If it's not an integer, attempt to convert it to a float
		if floatValue, err := strconv.ParseFloat(stringNumber, 64); err == nil {
			cacheStringToNumber[stringNumber] = intValue
			return floatValue
		} else {
			return nil
		}
	}
}

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

func getSchemaFromJsonSchemaFile(filePath string, dataFilePath string, dateErrorValue string) *schema.TableSchema {
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
	numberColumnNames := make([]string, 0)
	var tableSchemaLock sync.Mutex

	wg := sync.WaitGroup{}

	for fieldName, property := range _baseSchema.Properties {
		wg.Add(1)
		go func(fieldName string, property *jsonschema.Schema) {
			defer wg.Done()

			var fieldSchema schema.FieldSchema
			hashedFieldName := util.HashFieldName(fieldName)

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
					return
				}
				fieldType := fieldTypeList[0]

				// qsv does not comply with `--enum-threshold`, so we must filter enum length in client
				enum := make([]interface{}, 0)
				isErrorValueContained := false
				for _, item := range property.Enum {
					if item != "" && item != nil {
						if str, ok := item.(string); ok {
							if str == dateErrorValue {
								if !isErrorValueContained {
									enum = append(enum, item)
									isErrorValueContained = true
								}
							} else if str == dateErrorValue {
								enum = append(enum, defaultErrorValue)
								if !isErrorValueContained {
									isErrorValueContained = true
								}
							} else {
								enum = append(enum, item)
							}
						} else {
							enum = append(enum, item)
						}
					}
					if len(enum) > enumThreshold {
						break
					}
				}
				if len(enum) > enumThreshold || len(enum) == 0 {
					enum = nil
				}

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
							enum = nil
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

				fieldSchema = schema.FieldSchema{
					Name:         fieldName,
					Type:         detectedType,
					OriginalType: string(originalType),
					Nullable:     true,
					Enum:         enum,
				}

			}

			tableSchemaLock.Lock()
			tableSchema[hashedFieldName] = fieldSchema
			if fieldSchema.Type == schema.Number {
				numberColumnNames = append(numberColumnNames, hashedFieldName)
			}
			tableSchemaLock.Unlock()
		}(fieldName, property)
	}
	wg.Wait()

	if len(numberColumnNames) > 0 {
		getEnumForNumberColumns(dataFilePath, &tableSchema, numberColumnNames)
	}

	return &tableSchema
}

// qsv don't caculate enum for number columns, so we need to do it manually
func getEnumForNumberColumns(dataFilePath string, tableSchema *schema.TableSchema, numberColumnNames []string) {
	log.Println("Getting enum for number columns...", numberColumnNames)
	dataFile, err := os.Open(dataFilePath)
	if err != nil {
		log.Fatalf("Cannot open data file %s\n", dataFilePath)
	}
	defer dataFile.Close()

	reader := csv.NewReader(dataFile)
	firstLine := true

	numberEnumMaps := make(map[string]map[interface{}]bool) // fieldName - enum map
	numberEnumCheckDone := make(map[string]bool)            // fieldName - bool
	for _, fieldName := range numberColumnNames {
		numberEnumMaps[fieldName] = make(map[interface{}]bool)
		numberEnumCheckDone[fieldName] = false
	}
	numberColumnIndexes := make(map[int]string) // index - fieldName

	for {
		line, err := reader.Read()
		if err != nil {
			if err.Error() == "EOF" {
				break
			}
			log.Fatalln("Error when reading file: ", err.Error())
		}

		if firstLine {
			for index, rawFieldName := range line {
				fieldName := util.HashFieldName(rawFieldName)
				if _, ok := numberEnumMaps[fieldName]; ok {
					numberColumnIndexes[index] = fieldName
				}
			}
			firstLine = false
			continue // Skip the first line
		}
		for index, fieldName := range numberColumnIndexes {
			stringNumber := line[index]
			if stringNumber != "" {
				convertedNumber := convertStringNumberToNumberType(stringNumber)
				if convertedNumber == nil {
					continue
				}
				if _, ok := numberEnumMaps[fieldName][convertedNumber]; !ok {
					numberEnumMaps[fieldName][convertedNumber] = true
					if len(numberEnumMaps[fieldName]) > enumThreshold {
						numberEnumCheckDone[fieldName] = true
					}
				}
			}
		}
		isDone := true
		for _, fieldName := range numberColumnNames {
			if numberEnumCheckDone[fieldName] != true {
				isDone = false
				break
			}
		}
		if isDone {
			break
		}
	}
	for _, fieldName := range numberColumnNames {
		enum := make([]interface{}, 0)
		for key := range numberEnumMaps[fieldName] {
			enum = append(enum, key)
		}
		if len(enum) == 0 || len(enum) > enumThreshold {
			enum = nil
		}
		schemaField := (*tableSchema)[fieldName]
		schemaField.Enum = enum
		(*tableSchema)[fieldName] = schemaField
	}
}

func uploadSchema(schema *schema.TableSchema, s3Config s3.S3HandlerConfig, dataSourceId string, syncVersion string) error {
	schemaJson, err := jsoniter.Marshal(*schema)
	if err != nil {
		log.Fatalf("Error when marshalling schema: %+v\n", err)
	}
	handler, err := s3.NewHandlerWithConfig(&s3Config)
	if err != nil {
		log.Fatalf("Error when initializing s3 handler: %+v\n", err)
	}
	log.Println("Uploading schema to s3...")
	schemaFileKey := fmt.Sprintf("schema/%s-%s.json", dataSourceId, syncVersion)
	err = handler.UploadFileWithBytes(schemaFileKey, schemaJson, nil)
	if err != nil {
		log.Fatalf("Error when uploading schema to s3: %+v\n", err)
		return err
	}
	return nil
}

func main() {
	schemaFile := flag.String("schemaFile", "", "schema")
	dataFile := flag.String("dataFile", "", "data")
	s3Endpoint := flag.String("s3Endpoint", "", "s3 url")
	s3Region := flag.String("s3Region", "", "s3 region")
	s3Bucket := flag.String("s3Bucket", "", "s3 bucket")
	s3AccessKey := flag.String("s3AccessKey", "", "s3 access key")
	s3SecretKey := flag.String("s3SecretKey", "", "s3 secret key")
	dataSourceId := flag.String("dataSourceId", "", "data source id")
	syncVersion := flag.String("syncVersion", "", "sync version")
	dateErrorValue := flag.String("dateErrorValue", defaultDateErrorValue, "date error value")

	flag.Parse()

	schema := getSchemaFromJsonSchemaFile(*schemaFile, *dataFile, *dateErrorValue)

	err := uploadSchema(
		schema,
		s3.S3HandlerConfig{
			Endpoint:  *s3Endpoint,
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
	log.Println("Schema uploaded successfully")
}
