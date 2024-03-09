package main

import (
	"bufio"
	"context"
	"downloader/libs/schema"
	"downloader/util"
	"downloader/util/s3"
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"runtime"
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

type CommonInput struct {
	SpreadsheetId *string
	SheetId *string
	SheetName *string
	AccessToken *string
	DataSourceId *string
	SyncVersion *string
	TimeZone *string
}

type S3Input struct {
	S3Endpoint *string
	S3Region *string
	S3Bucket *string
	S3AccessKey *string
	S3SecretKey *string
}

var (
	SchemaPrimaryField = &schema.FieldSchema{
		Id: schema.HashedPrimaryField,
		Name:         schema.PrimaryFieldName,
		Type:         schema.String,
		OriginalType: string(exceltype.String),
		Nullable:     false,
		Primary:      true,
	}

	ExcelErrorValues = map[string]bool{
		"#NULL!":  true,
		"#DIV/0!": true,
		"#VALUE!": true,
		"#REF!":   true,
		"#NAME?":  true,
		"#NUM!":   true,
		"#N/A":    true,
		"#ERROR!": true,
	}
)

const (
	ErrorValue = "__Error"
)

func main() {
	start := time.Now()

	// xlsxFile := flag.String("xlsxFile", "", "Xlsx file")
	csvFile := flag.String("csvFile", "", "Csv file")
	spreadsheetId := flag.String("spreadsheetId", "", "Spread sheet id")
	sheetId := flag.String("sheetId", "", "Sheet id")
	sheetName := flag.String("sheetName", "", "Sheet name")
	accessToken := flag.String("accessToken", "", "Access token")
	dataSourceId := flag.String("dataSourceId", "", "data source id")
	syncVersion := flag.String("syncVersion", "", "sync version")
	timeZone := flag.String("timeZone", "UTC", "Timezone of worksheet")
	s3Endpoint := flag.String("s3Endpoint", "", "s3 url")
	s3Region := flag.String("s3Region", "", "s3 region")
	s3Bucket := flag.String("s3Bucket", "", "s3 bucket")
	s3AccessKey := flag.String("s3AccessKey", "", "s3 access key")
	s3SecretKey := flag.String("s3SecretKey", "", "s3 secret key")

	flag.Parse()

	commonInput := CommonInput{
		SpreadsheetId: spreadsheetId,
		SheetId: sheetId,
		SheetName: sheetName,
		AccessToken: accessToken,
		DataSourceId: dataSourceId,
		SyncVersion: syncVersion,
		TimeZone: timeZone,
	}

	s3Input := S3Input{
		S3Endpoint: s3Endpoint,
		S3Region: s3Region,
		S3Bucket: s3Bucket,
		S3AccessKey: s3AccessKey,
		S3SecretKey: s3SecretKey,
	}

    // Open the CSV file
    firstFile, err := os.Open(*csvFile)
    if err != nil {
        panic(err)
    }
    defer firstFile.Close()

    reader := csv.NewReader(bufio.NewReader(firstFile))

    // Check the file
    headers, err := reader.Read()
	if err != nil {
		log.Fatalf("Error reading CSV file: %s", err)
	}
	if len(headers) == 0 {
		log.Fatalf("Empty header")
	}
	realIdColIndex := -1
	isMissedIdColumn := false
	selectedColIndexes := make([]string, 0)
	for index, header := range headers {
		header := strings.TrimSpace(header)
		if header != "" {
			if header == "__StarionId" {
				realIdColIndex = index
			}
			selectedColIndexes = append(selectedColIndexes, strconv.Itoa(index+1))
		}
	}
	if realIdColIndex == -1 {
		isMissedIdColumn = true
		realIdColIndex = len(headers)
	}
	fmt.Println("realIdColIndex", realIdColIndex)
	if len(selectedColIndexes) < len(headers) {
		fmt.Println("selectedColIndexes", selectedColIndexes)
		// Trim the file (select only non-empty columns)
		runCommandTrimFile(selectedColIndexes, *csvFile, "file.csv")
		firstFile.Close()
		// open new file
		newFile, err := os.Open("file.csv")
		if err != nil {
			panic(err)
		}
		defer newFile.Close()
		// open new reader and re-read headers
		reader = csv.NewReader(bufio.NewReader(newFile))
		headers, err = reader.Read()
		if err != nil {
			log.Fatalf("Error reading new CSV file: %s", err)
		}
		*csvFile = "file.csv"
	}

	// infer schema
	runCommandInferSchema(*csvFile, "schema.json")

	headerIndexes := getHeaderIndex(headers)
	tableSchema := GetSchema("schema.json", headerIndexes)

	fieldSchemaMap := getIndexSchemaField(tableSchema) // used for iterate data

	// init chan
    lines := make(chan *LineData, 10000) // Buffer to hold lines for processing
    writeChan := make(chan []*string, 10000) // Buffer to hold lines for processing
	fixIdChan := make(chan *FixIdData, 10000) // Buffer to hold lines for processing
    var processWg sync.WaitGroup
    var afterProcessWg sync.WaitGroup

	afterProcessWg.Add(1)
	go fixIdColumn(fixIdChan, isMissedIdColumn, realIdColIndex, &commonInput, &afterProcessWg)
	afterProcessWg.Add(1)
	go writeAndUploadParquet(writeChan, fieldSchemaMap, &commonInput, &s3Input, &afterProcessWg)
	afterProcessWg.Add(1)
	go uploadSchema(tableSchema, s3.S3HandlerConfig{
		Endpoint:  *s3Input.S3Endpoint,
		Region:    *s3Input.S3Region,
		AccessKey: *s3Input.S3AccessKey,
		SecretKey: *s3Input.S3SecretKey,
		Bucket:    *s3Input.S3Bucket,
	}, *commonInput.DataSourceId, *commonInput.SyncVersion, &afterProcessWg)

	if (isMissedIdColumn) {
		fmt.Println("add id name fix")
		// title id column
		fixIdChan <- &FixIdData{
			RowId: "__StarionId",
			RowIndex: 0,
		}
		fmt.Println("finish add id name fix")
	}

    // Start process workers
    numWorkers := runtime.NumCPU() // Adjust based on your CPU/core count
    for i := 0; i < numWorkers; i++ {
        processWg.Add(1)
        go processLines(lines, writeChan, fixIdChan, fieldSchemaMap, *tableSchema, isMissedIdColumn, &commonInput, &processWg)
    }

	
	rowIndex := 0
    for {
        record, err := reader.Read()
        if err == io.EOF {
            break
        }
        if err != nil {
            panic(err)
        }

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
func processLines(lines <-chan *LineData, writeChan chan<- []*string, fixIdChan chan<- *FixIdData, fieldSchemaMap map[int]schema.FieldSchema, tableSchema schema.TableSchema, isCreatedIdCol bool, commonInput *CommonInput, wg *sync.WaitGroup) {
    defer wg.Done()
	
	location, err := time.LoadLocation(*commonInput.TimeZone)
    if err != nil {
		log.Fatalf("Error when loading location: %+v\n", err)
    }

	idColIndex := tableSchema[schema.HashedPrimaryField].Index
	emptyValue := ""

    for line := range lines {
		writeDataLen := len(tableSchema)
		writeData := make([]*string, writeDataLen)

		// TODO: process line values
		for index, valueIterate := range line.Data {
			// ignore empty value
			if valueIterate == "" {
				writeData[index] = &emptyValue
				continue
			}

			// error value
			if valueIterate[0] == '#' {
				if _, ok := ExcelErrorValues[valueIterate]; ok {
					value := ErrorValue
					writeData[index] = &value
				}
				continue
			}

			fieldType := fieldSchemaMap[index].Type
			// parse date
			if fieldType == schema.Date {
				// remove Z at the end of date for correct parsing
				if valueIterate[len(valueIterate)-1] == 'Z' {
					valueIterate = valueIterate[:len(valueIterate)-1]
				}
				value := parseDate(strings.TrimSpace(valueIterate), location)
				writeData[index] = &value
				continue
			}
			
			// normal value
			value := strings.TrimSpace(valueIterate)
			writeData[index] = &value
		}

		// TODO: process id column
		if isCreatedIdCol {
			fixId := FixIdData{
				RowId: util.GenUUID(),
				RowIndex: line.RowIndex,
			}
			writeData[idColIndex] = &fixId.RowId
			fixIdChan <- &fixId
		} else {
			curId := line.Data[idColIndex]
			if curId == "" || !util.IsValidUUID(curId) {
				fixId := FixIdData{
					RowId: util.GenUUID(),
					RowIndex: line.RowIndex,
				}
				writeData[idColIndex] = &fixId.RowId
				fixIdChan <- &fixId
			}
		}

		writeChan <- writeData
    }

}

func fixIdColumn(fixIds chan *FixIdData, isCreateIdCol bool, idColIndex int, commonInput *CommonInput, wg *sync.WaitGroup) {
	defer wg.Done()

	fmt.Println("Start fixing id column")

	spreadsheetId := *commonInput.SpreadsheetId
	sheetName := *commonInput.SheetName
	sheetIdInt, _ := strconv.Atoi(*commonInput.SheetId)
	ctx := context.Background()
	token := oauth2.Token{
		// AccessToken: "ya29.a0Ad52N38oB4wnhxnCF1Vm8ZwPK-i80fCaKsKaslKWbc5caqgiURJTw4WY7x342FXYCYCE6Ld7ztY59Rnf3b6YpCw046p81DmdNbfkteh43TgE_Zrs7-5omJqvDKDkHJ1bvPHKS3Gs4ix2G13agHKubGnaDr18Vx9xSF8IMNgaCgYKAYMSARASFQHGX2MiiaW9GS6NW6ozsH1xozHDhQ0174",
		AccessToken: *commonInput.AccessToken,
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
	}

	batchSize := 40000
	batchData := make([]FixIdData, 0, batchSize)
	var batchGroup sync.WaitGroup

	for data := range fixIds {
		batchData = append(batchData, *data)
		if len(batchData) == batchSize {
			batchGroup.Add(1)
			go processBatchGoogleSheetsFixId(batchData, sheetClient, spreadsheetId, sheetName, idColIndex, batchSize, &batchGroup)

			// end batch
			batchData = make([]FixIdData, 0, batchSize)
		}
    }

	if len(batchData) > 0 {
		batchGroup.Add(1)
		go processBatchGoogleSheetsFixId(batchData, sheetClient, spreadsheetId, sheetName, idColIndex, batchSize, &batchGroup)
	}

	batchGroup.Wait()

	fmt.Println("Finish fixing id column")
}

func writeAndUploadParquet(dataChan <-chan []*string, fieldSchemaMap map[int]schema.FieldSchema, commonInput *CommonInput, s3Config *S3Input, wg *sync.WaitGroup) {
	defer wg.Done()
	fmt.Printf("Start writing parquet\n")

	// init parquet writer
	pqSchema := make([]string, len(fieldSchemaMap))
	for index, field := range fieldSchemaMap {
		pqSchema[index] = fmt.Sprintf("name=%s, type=BYTE_ARRAY, convertedtype=UTF8", field.Id)
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

	// stop parquet writer
	if err = pw.WriteStop(); err != nil {
		log.Println("WriteStop error", err)
	}

	fmt.Printf("Finish writing parquet\n")

	wg.Add(1)
	go uploadData("test.parquet", s3.S3HandlerConfig{
		Endpoint:  *s3Config.S3Endpoint,
		Region:    *s3Config.S3Region,
		AccessKey: *s3Config.S3AccessKey,
		SecretKey: *s3Config.S3SecretKey,
		Bucket:    *s3Config.S3Bucket,
	}, *commonInput.DataSourceId, *commonInput.SyncVersion, wg)
	fmt.Println("Finish uploading parquet")
}

func GetSchema(schemaFilePath string, headerIndexes map[string]int) (*schema.TableSchema) {
	isMissedIdCol := true

	jsonFile, err := os.Open(schemaFilePath)
    if err != nil {
        log.Fatalln("Error opening JSON file:", err)
    }
    defer jsonFile.Close()

    // Read the file content
    byteValue, err := io.ReadAll(jsonFile)
    if err != nil {
		log.Fatalln()
    }

    // Use jsoniter to unmarshal the byte value into the struct
    var json = jsoniter.ConfigCompatibleWithStandardLibrary
	var schemaFile MarshaledSchemaFile
    err = json.Unmarshal(byteValue, &schemaFile)
    if err != nil {
		log.Fatalln("Error unmarshalling JSON:", err)
    }

	tableSchema := make(schema.TableSchema, len(schemaFile.Properties))

	for fieldName, field := range schemaFile.Properties {
		var fieldSchema schema.FieldSchema
		hashedFieldName := util.HashFieldName(fieldName)
		realFieldIndex := headerIndexes[fieldName]

		if hashedFieldName == schema.HashedPrimaryField {
			fieldSchema = *SchemaPrimaryField
			fieldSchema.Index = realFieldIndex
			isMissedIdCol = false
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
				Id: 		 hashedFieldName,
				Name:         fieldName,
				Type:         detectedType,
				OriginalType: string(originalType),
				Nullable:     true,
				Primary:      false,
				Index: realFieldIndex,
			}
		}
		
		tableSchema[hashedFieldName] = fieldSchema
	}

	if isMissedIdCol {
		// assign primary field with index
		maxFieldIndex := 0
		for _, field := range tableSchema {
			if field.Index > maxFieldIndex {
				maxFieldIndex = field.Index
			}
		}

		newSchemaField := *SchemaPrimaryField
		tableSchema[schema.HashedPrimaryField] = newSchemaField
	}

	return &tableSchema
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

func processBatchGoogleSheetsFixId(batchData []FixIdData, sheetClient *sheets.Service, spreadsheetId string, sheetName string, idColIndex int, batchSize int, wg *sync.WaitGroup) {
	defer wg.Done()

	fmt.Println("start processBatchGoogleSheetsFixId")

	sort.Sort(FixIdDataArray(batchData))

	updateBatches := make(UpdateIdData)
	prevRowIndex := batchData[0].RowIndex
	curFirstRowIndex := batchData[0].RowIndex
	var curUpdateBatchData = make([]string, 0, batchSize)
	curUpdateBatchData = append(curUpdateBatchData, batchData[0].RowId)

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
	if len(curUpdateBatchData) > 0 {
		updateBatches[curFirstRowIndex] = curUpdateBatchData
	}

	// do call update api
	updateValues := generateUpdateIdGoogleSheetsData(updateBatches, sheetName, idColIndex)
	fmt.Printf("updateValues: %+v\n", updateValues)
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
	idColIndex++
	result := make([]*sheets.ValueRange, len(data))
	for firstRowNumber, values := range data {
		formattedValues := make([][]interface{}, len(values))
		for i, val := range values {
			formattedValues[i] = []interface{}{val}
		}
		valueRange := fmt.Sprintf("%s!R%[2]dC%[3]d:R%[4]dC%[3]d", util.FormatSheetNameInRange(sheetName), firstRowNumber+1, idColIndex, firstRowNumber+len(values))
		result = append(result, &sheets.ValueRange{
			Range:  valueRange,
			Values: formattedValues,
		})
	}
	return result
}

func uploadSchema(schema *schema.TableSchema, s3Config s3.S3HandlerConfig, dataSourceId string, syncVersion string, wg *sync.WaitGroup) error {
	defer wg.Done()

	schemaJson, err := jsoniter.Marshal(*schema)
	if err != nil {
		log.Fatalf("Error when marshalling schema: %+v\n", err)
	}
	handler, err := s3.NewHandlerWithConfig(&s3Config)
	if err != nil {
		log.Fatalf("Error when initializing s3 handler: %+v\n", err)
	}
	schemaFileKey := fmt.Sprintf("schema/%s-%s.json", dataSourceId, syncVersion)
	err = handler.UploadFileWithBytes(schemaFileKey, schemaJson, nil)
	if err != nil {
		log.Fatalf("Error when uploading schema to s3: %+v\n", err)
		return err
	}
	return nil
}

func uploadData(dataFilePath string, s3Config s3.S3HandlerConfig, dataSourceId string, syncVersion string, wg *sync.WaitGroup) error {
	defer wg.Done()
	
	handler, err := s3.NewHandlerWithConfig(&s3Config)
	if err != nil {
		log.Fatalf("Error when initializing s3 handler: %+v\n", err)
	}
	dataFileKey := fmt.Sprintf("data/%s-%s.parquet", dataSourceId, syncVersion)
	err = handler.UploadFile(dataFileKey, dataFilePath)
	if err != nil {
		log.Fatalf("Error when uploading data to s3: %+v\n", err)
		return err
	}
	return nil
}

func parseDate(dateStr string, location *time.Location) string {
    dateLayout := "2006-01-02"
    dateTimeLayout := "2006-01-02T15:04:05"
	outputLayout := "2006-01-02T15:04:05.999Z"

	fmt.Println("dateStr", dateStr)

    if t, err := time.ParseInLocation(dateLayout, dateStr, location); err == nil {
		return t.UTC().Format(outputLayout)
    }

    if t, err := time.ParseInLocation(dateTimeLayout, dateStr, location); err == nil {
        return t.UTC().Format(outputLayout)
    } else {
		log.Fatalf("Cannot parse date: %+v", err)
	}

	return ErrorValue
}

func runCommandTrimFile(selectedColIndexes []string, csvFilePath string, outputFilePath string) {
	cmd := exec.Command(
		"/usr/local/bin/qsv",
		"select", strings.Join(selectedColIndexes, ","),
		"-o", outputFilePath,
		csvFilePath,
	)
	err := cmd.Run()
	if err != nil {
		log.Fatalf("Error when running command: %+v", err)
	}
}

func runCommandInferSchema(csvFilePath string, outputFilePath string) {
	outFile, err := os.Create(outputFilePath)
	if err != nil {
		log.Fatalf("Error when creating output file: %+v", err)
	}
	defer outFile.Close()

	cmd := exec.Command(
		"/usr/local/bin/qsv",
		"schema",
		"--dates-whitelist", "all",
		"--enum-threshold", "0",
		"--strict-dates",
		"--stdout",
		csvFilePath,
	)
	cmd.Stdout = outFile
	err = cmd.Run()
	if err != nil {
		log.Fatalf("Error when running command: %+v", err)
	}
}