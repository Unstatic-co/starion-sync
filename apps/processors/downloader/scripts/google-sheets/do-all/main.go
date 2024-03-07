package main

import (
	"bufio"
	"downloader/libs/schema"
	"downloader/util"
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"sync"

	exceltype "downloader/libs/datatype/excel"
	"time"

	jsoniter "github.com/json-iterator/go"
	"github.com/samber/lo"

	"github.com/xitongsys/parquet-go-source/local"
	"github.com/xitongsys/parquet-go/writer"
)

type MarshaledSchemaFile struct {
	Properties        map[string]MarshaledSchemaFileField    `json:"properties"`
}
type MarshaledSchemaFileField struct {
	Type []string `json:"type"`
	Format string `json:"format"`
	Enum []interface{} `json:"enum"`
}

func GetSchema(schemaFilePath string, headerIndexes map[string]int) (*schema.TableSchema, error) {
	jsonFile, err := os.Open(schemaFilePath)
    if err != nil {
        fmt.Println("Error opening JSON file:", err)
        return nil, err
    }
    defer jsonFile.Close()

    // Read the file content
    byteValue, err := io.ReadAll(jsonFile)
    if err != nil {
        fmt.Println("Error reading JSON file:", err)
        return nil, err
    }

    // Use jsoniter to unmarshal the byte value into the struct
    var json = jsoniter.ConfigCompatibleWithStandardLibrary
	var schemaFile MarshaledSchemaFile
    err = json.Unmarshal(byteValue, &schemaFile)
    if err != nil {
        fmt.Println("Error unmarshalling JSON:", err)
        return nil, err
    }

	tableSchema := make(schema.TableSchema, len(schemaFile.Properties))

	for fieldName, field := range schemaFile.Properties {
		var fieldSchema schema.FieldSchema
		hashedFieldName := util.HashFieldName(fieldName)

		if hashedFieldName == schema.HashedPrimaryField {
			fieldSchema = schema.FieldSchema{
				Name:         schema.PrimaryFieldName,
				Type:         schema.String,
				OriginalType: string(exceltype.String),
				Nullable:     false,
				Primary:      true,
				Index: headerIndexes[fieldName],
			}
		} else {
			detectedType := schema.String
			var originalType exceltype.ExcelDataType
			if (len(field.Type) > 0) {
				switch field.Type[0] {
					case "string":
						switch field.Format {
							case "date-time":
								detectedType = schema.Date
								originalType = exceltype.Number
							case "date":
								detectedType = schema.Date
								originalType = exceltype.Number
							default:
								if len(field.Enum) > 0 && len(field.Enum) < 3 && inferBooleanType(field.Enum) {
									detectedType = schema.Boolean
									originalType = exceltype.Logical
								} else {
									detectedType = schema.String
									originalType = exceltype.String
								}
						}
					case "null":
						// If column does not have data
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
							"Encountered unsupported type",
						)
					case "object":
						log.Fatalf(
							"Encountered unsupported type",
						)
					default:
						log.Fatalf("Unknown data type")
				}
			}

			fieldSchema = schema.FieldSchema{
				Name:         fieldName,
				Type:         detectedType,
				OriginalType: string(originalType),
				Nullable:     true,
				Primary:      false,
				Index: headerIndexes[fieldName],
			}
		}
		
		tableSchema[hashedFieldName] = fieldSchema
	}

	return &tableSchema, nil
}

func main() {
	start := time.Now()

	// xlsxFile := flag.String("xlsxFile", "", "Xlsx file")
	csvFile := flag.String("csvFile", "", "Csv file")
	schemaFile := flag.String("schemaFile", "", "Schema file")

	flag.Parse()

	// f, err := excelize.OpenFile("Date.xlsx")
	// // f, err := excelize.OpenFile("10k row.xlsx")
	// if err != nil {
		// fmt.Println(err)
		// return
	// }
	// defer func() {
		// // Close the spreadsheet.
		// if err := f.Close(); err != nil {
			// fmt.Println(err)
		// }
	// }()

	// // Get all the rows in the Sheet1.
	// // rows, err := f.Rows("Trang tính1")
	// rows, err := f.Rows("Sheet1")
	// if err != nil {
	// 	fmt.Println(err)
	// 	return
	// }
	// fmt.Println("Start reading rows")
	// for rows.Next() {
	// 	row, err := rows.Columns(excelize.Options{
	// 		RawCellValue: false,
	// 		LongDatePattern: "2006-01-02T15:04:05Z07:00",
	// 		ShortDatePattern: "2006-01-02",
	// 	})
	// 	if err != nil {
	// 		fmt.Println(err)
	// 	}
	// 	for _, colCell := range row {
	// 		fmt.Print(colCell, "\t")
	// 	}
	// 	fmt.Println()
	// }

	// // Close the stream
	// if err = rows.Close(); err != nil {
	// 	fmt.Println(err)
	// }

    const numWorkers = 1 // Adjust based on your CPU/core count

	fmt.Printf("csvFile: %s\n", *csvFile)

    // Open the CSV file
    file, err := os.Open(*csvFile)
    if err != nil {
        panic(err)
    }
    defer file.Close()

    reader := csv.NewReader(bufio.NewReader(file))
	// reader.TrimLeadingSpace = true
	// reader.ReuseRecord = true

	// init chan
    lines := make(chan []string, 10000) // Buffer to hold lines for processing
    writeChan := make(chan []*string, 10000) // Buffer to hold lines for processing
    var wg sync.WaitGroup

    // Read the CSV file and send lines to workers
    header, err := reader.Read()
	if err != nil {
		log.Fatalf("Error reading CSV file: %s", err)
	}
	if len(header) == 0 {
		fmt.Println("CSV file is empty")
		return
	}
	headerIndexes := getHeaderIndex(header)

	tableSchema, err := GetSchema(*schemaFile, headerIndexes)
	if err != nil {
		log.Fatalf("Error getting schema: %s", err)
	}
	fieldSchemaMap := getIndexSchemaField(tableSchema)

    // Start workers
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
		go writeParquet(writeChan, fieldSchemaMap)
        go processLines(lines, writeChan, &wg)
    }
	
    for {
        record, err := reader.Read()
        if err == io.EOF {
            break
        }
        if err != nil {
            panic(err)
        }

		// fmt.Println(record)
        lines <- record // Send the record to a worker for processing
    }
    close(lines) // Close the channel to signal to the workers that there's no more work
    wg.Wait()    // Wait for all workers to finish processing
	close(writeChan)

	elapsed := time.Since(start)
	fmt.Println("Execution time:", elapsed)
}

// Worker to process lines
func processLines(lines <-chan []string, writeChan chan<- []*string, wg *sync.WaitGroup) {
    defer wg.Done()

    for line := range lines {
		// fmt.Printf("line: %s", line)
        // Process the line here
        // This is where you'd typically parse the fields and do something with them
		writeData := make([]*string, len(line))
		for i, valueIterate := range line {
			// fmt.Printf("valueIterate: %s\n", valueIterate)
			valueRef := strings.TrimSpace(valueIterate)
			writeData[i] = &valueRef
			// fmt.Print(value, "\t")
		}
		writeChan <- writeData
		// fmt.Println()
    }

}

func writeParquet(dataChan <-chan []*string, fieldSchemaMap map[int]schema.FieldSchema) {
	fmt.Printf("Start writing parquet\n")

	// init parquet writer
	pqSchema := make([]string, len(fieldSchemaMap))
	for index, field := range fieldSchemaMap {
		pqSchema[index] = fmt.Sprintf("name=%s, type=BYTE_ARRAY, convertedtype=UTF8", field.Name)
	}

	fw, err := local.NewLocalFileWriter("test.parquet")
	defer fw.Close()
	if err != nil {
		return;
	}
	pw, err := writer.NewCSVWriter(pqSchema, fw, 4)
	if err != nil {
		return;
	}

	for data := range dataChan {
		if err := pw.WriteString(data); err != nil {
			log.Println("WriteString error", err)
		}
	}

	// stop parquet writer
	if err = pw.WriteStop(); err != nil {
		log.Println("WriteStop error", err)
	}

	fmt.Printf("Finish writing parquet\n")
}

func getHeaderIndex(row []string) map[string]int {
	header := make(map[string]int, len(row))
	for index, value := range row {
		header[value] = index
	}
	return header
}

func getIndexSchemaField(ischema *schema.TableSchema) map[int]schema.FieldSchema {
	var indexSchemaField = make(map[int]schema.FieldSchema, len(*ischema))
	for _, field := range *ischema {
		indexSchemaField[field.Index] = field
	}
	return indexSchemaField
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