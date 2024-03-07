package main

import (
	"bufio"
	"context"
	"downloader/libs/schema"
	"downloader/util"
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"

	exceltype "downloader/libs/datatype/excel"
	"time"

	jsoniter "github.com/json-iterator/go"
	"github.com/samber/lo"
	"golang.org/x/oauth2"

	"github.com/xitongsys/parquet-go-source/local"
	"github.com/xitongsys/parquet-go/writer"

	"github.com/google/uuid"

	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"
)

type MarshaledSchemaFile struct {
	Properties        map[string]MarshaledSchemaFileField    `json:"properties"`
}
type MarshaledSchemaFileField struct {
	Type []string `json:"type"`
	Format string `json:"format"`
	Enum []interface{} `json:"enum"`
}

type LineData struct {
	Data []string
	RowIndex int
}

type FixIdData struct {
	RowId string
	RowIndex int
}
type FixIdDataArray []FixIdData
func (a FixIdDataArray) Len() int           { return len(a) }
func (a FixIdDataArray) Less(i, j int) bool { return a[i].RowIndex < a[j].RowIndex }
func (a FixIdDataArray) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
type UpdateIdData map[int][]string // map[firstRowNumber][]id

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

    const numWorkers = 4 // Adjust based on your CPU/core count

	fmt.Printf("csvFile: %s\n", *csvFile)

    // Open the CSV file
    file, err := os.Open(*csvFile)
    if err != nil {
        panic(err)
    }
    defer file.Close()

    reader := csv.NewReader(bufio.NewReader(file))

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

	// find id column index
	var idColIndex int
	isCreateIdColumn := false
	if idField, ok := (*tableSchema)[schema.HashedPrimaryField]; ok {
		idColIndex = idField.Index
	} else {
		isCreateIdColumn = true
		maxFieldIndex := 0
		for _, field := range (*tableSchema) {
			if field.Index > maxFieldIndex {
				maxFieldIndex = field.Index
			}
		}
		idColIndex = maxFieldIndex + 1
	}

	// init chan
    lines := make(chan *LineData, 10000) // Buffer to hold lines for processing
    writeChan := make(chan []*string, 10000) // Buffer to hold lines for processing
	fixIdChan := make(chan *FixIdData, 10000) // Buffer to hold lines for processing
    var processWg sync.WaitGroup
    var afterProcessWg sync.WaitGroup

    // Start workers
    for i := 0; i < numWorkers; i++ {
        processWg.Add(1)
        go processLines(lines, writeChan, fixIdChan, fieldSchemaMap, *tableSchema, &processWg)
    }
	afterProcessWg.Add(1)
	go fixIdColumn(fixIdChan, isCreateIdColumn, idColIndex, &afterProcessWg)
	afterProcessWg.Add(1)
	go writeParquet(writeChan, fieldSchemaMap, &afterProcessWg)

	
	rowIndex := 0
    for {
        record, err := reader.Read()
        if err == io.EOF {
            break
        }
        if err != nil {
            panic(err)
        }

		// fmt.Println(record)
		rowIndex++
		line := LineData{
			Data: record,
			RowIndex: rowIndex,
		}
        lines <- &line // Send the record to a worker for processing
    }
    close(lines) // Close the channel to signal to the workers that there's no more work
    processWg.Wait()    // Wait for all workers to finish processing
	close(fixIdChan)
	close(writeChan)
	afterProcessWg.Wait()

	elapsed := time.Since(start)
	fmt.Println("Execution time:", elapsed)
}

// Worker to process lines
func processLines(lines <-chan *LineData, writeChan chan<- []*string, fixIdChan chan<- *FixIdData, fieldSchemaMap map[int]schema.FieldSchema, tableSchema schema.TableSchema, wg *sync.WaitGroup) {
    defer wg.Done()

	// find id column
	var idColIndex int
	isCreateIdColumn := false
	if idField, ok := tableSchema[schema.HashedPrimaryField]; ok {
		idColIndex = idField.Index
	} else {
		isCreateIdColumn = true
		maxFieldIndex := 0
		for _, field := range tableSchema {
			if field.Index > maxFieldIndex {
				maxFieldIndex = field.Index
			}
		}
		idColIndex = maxFieldIndex + 1
	}

    for line := range lines {
		fieldCount := len(fieldSchemaMap)

		writeData := make([]*string, fieldCount)
		for i, valueIterate := range line.Data {
			// fmt.Printf("valueIterate: %s\n", valueIterate)
			valueRef := strings.TrimSpace(valueIterate)
			writeData[i] = &valueRef
			// fmt.Print(value, "\t")
		}
		writeChan <- writeData

		if isCreateIdColumn {
			fixId := FixIdData{
				RowId: uuid.NewString(),
				RowIndex: line.RowIndex,
			}
			fixIdChan <- &fixId
		} else {
			curId := line.Data[idColIndex]
			if curId == "" || !util.IsValidUUID(curId) {
				fixId := FixIdData{
					RowId: uuid.NewString(),
					RowIndex: line.RowIndex,
				}
				fixIdChan <- &fixId
			}
		}
		// fmt.Println()
    }

}

func fixIdColumn(fixIds chan *FixIdData, isCreateIdCol bool, idColIndex int, wg *sync.WaitGroup) {
	defer wg.Done()

	spreadsheetId := "1COvhrUlnPv_wMrCrCOWM-5-wuVm7Vrtmm6O0F_gNWxs"
	sheetName := "Sheet1"
	sheetIdInt, _ := strconv.Atoi("0")
	ctx := context.Background()
	token := oauth2.Token{
		AccessToken: "",
	}
	tokenSource := oauth2.StaticTokenSource(&token)
	sheetClient, err := sheets.NewService(ctx, option.WithTokenSource(tokenSource))
	if err != nil {
		log.Fatalln("Error when creating client to update id col", err)
	}

	// append dimension optionally
	if isCreateIdCol {
		res, err := sheetClient.Spreadsheets.Get(spreadsheetId).Ranges(util.FormatSheetNameInRange(sheetName)).IncludeGridData(false).Fields(googleapi.Field("sheets.properties.gridProperties.columnCount")).Do()
		if err != nil {
			log.Fatal("Error when getting column count", err)
		}
		columnCount := res.Sheets[0].Properties.GridProperties.ColumnCount
		if columnCount < int64(idColIndex) {
			_, err = sheetClient.Spreadsheets.BatchUpdate(spreadsheetId, &sheets.BatchUpdateSpreadsheetRequest{
				Requests: []*sheets.Request{
					{
						InsertDimension: &sheets.InsertDimensionRequest{
							InheritFromBefore: true,
							Range: &sheets.DimensionRange{
								SheetId:    int64(sheetIdInt),
								Dimension:  "COLUMNS",
								StartIndex: int64(idColIndex - 1),
								EndIndex:   int64(idColIndex),
							},
						},
					},
				},
			}).Do()
			if err != nil {
				log.Fatalln("Error when inserting column", err)
			}
		}

		// title id column
		fixIds <- &FixIdData{
			RowId: "__StarionId",
			RowIndex: 0,
		}
	}

	batchSize := 5000
	batchData := make([]FixIdData, 0, batchSize)

	for data := range fixIds {
		fmt.Printf("Fixing id: %s\n", data.RowIndex)
		batchData = append(batchData, *data)
		if len(batchData) == batchSize {
			processBatchGoogleSheetsFixId(batchData, sheetClient, spreadsheetId, sheetName, idColIndex, batchSize)

			// end batch
			batchData = make([]FixIdData, 0, batchSize)
		}
    }

	if len(batchData) > 0 {
		processBatchGoogleSheetsFixId(batchData, sheetClient, spreadsheetId, sheetName, idColIndex, batchSize)
	}
}

func writeParquet(dataChan <-chan []*string, fieldSchemaMap map[int]schema.FieldSchema, wg *sync.WaitGroup) {
	defer wg.Done()
	fmt.Printf("Start writing parquet\n")

	// init parquet writer
	pqSchema := make([]string, len(fieldSchemaMap))
	for index, field := range fieldSchemaMap {
		pqSchema[index] = fmt.Sprintf("name=%s, type=BYTE_ARRAY, convertedtype=UTF8", field.Name)
	}

	fw, err := local.NewLocalFileWriter("test.parquet")
	if err != nil {
		fmt.Printf("Can't open file: %s\n", err)
		return;
	}
	defer fw.Close()
	pw, err := writer.NewCSVWriter(pqSchema, fw, 4)
	if err != nil {
		fmt.Printf("Can't create csv writer: %s\n", err)
		return;
	}

	for data := range dataChan {
		if err := pw.WriteString(data); err != nil {
			log.Println("WriteString error", err)
		}
	}

	fmt.Printf("Finish writing parquet\n")

	// stop parquet writer
	if err = pw.WriteStop(); err != nil {
		log.Println("WriteStop error", err)
	}

	// fmt.Printf("Finish writing parquet\n")
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

func processBatchGoogleSheetsFixId(batchData []FixIdData, sheetClient *sheets.Service, spreadsheetId string, sheetName string, idColIndex int, batchSize int) {
	sort.Sort(FixIdDataArray(batchData))
	updateBatches := make(UpdateIdData)
	prevRowIndex := batchData[0].RowIndex
	curFirstRowIndex := batchData[0].RowIndex
	var curUpdateBatchData = make([]string, 0, batchSize)
	for i := 1; i < len(batchData); i++ {
		fixIdData := batchData[i]
		if prevRowIndex+1 == fixIdData.RowIndex {
			curUpdateBatchData = append(curUpdateBatchData, fixIdData.RowId)
		} else {
			// end old update batch
			updateBatches[curFirstRowIndex] = curUpdateBatchData
			// start new update batch
			curUpdateBatchData = make([]string, 0, batchSize)
			curUpdateBatchData = append(curUpdateBatchData, fixIdData.RowId)
			curFirstRowIndex = fixIdData.RowIndex
		}
		prevRowIndex = fixIdData.RowIndex
	}

	// do call update api
	updateValues := generateUpdateIdGoogleSheetsData(updateBatches, sheetName, idColIndex)
	_, err := sheetClient.Spreadsheets.Values.
		BatchUpdate(spreadsheetId, &sheets.BatchUpdateValuesRequest{
			ValueInputOption:        "RAW",
			Data:                    updateValues,
			IncludeValuesInResponse: false,
		}).
		Do()
	if err != nil {
		log.Fatalln("Error when updating id col", err)
	}
}

func generateUpdateIdGoogleSheetsData(data UpdateIdData, sheetName string, idColIndex int) []*sheets.ValueRange {
	result := make([]*sheets.ValueRange, len(data))
	for firstRowNumber, values := range data {
		formattedValues := make([][]interface{}, len(values))
		for i, val := range values {
			formattedValues[i] = []interface{}{val}
		}
		valueRange := fmt.Sprintf("%s!R%[2]dC%[3]d:R%[4]dC%[3]d", util.FormatSheetNameInRange(sheetName), firstRowNumber, idColIndex, firstRowNumber+len(values)-1)
		result = append(result, &sheets.ValueRange{
			Range:  valueRange,
			Values: formattedValues,
		})
	}
	return result
}