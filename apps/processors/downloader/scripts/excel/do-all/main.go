package main

import (
	"bufio"
	"bytes"
	"downloader/libs/schema"
	"downloader/service/excel"
	"downloader/util"
	"downloader/util/s3"
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"net/http"
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
	SessionId *string
	DriveId *string
	WorkbookId *string
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
	S3Ssl *bool
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

	errorMutex sync.Mutex
)

const (
	ErrorValue = "__Error"
    DateLayout = "2006-01-02"
    DateTimeLayout = "2006-01-02T15:04:05"
	DateOutputLayout = "2006-01-02T15:04:05.999Z"

)

func main() {
	start := time.Now()

	xlsxFile := flag.String("xlsxFile", "", "Xlsx file")
	xlsxSheetName := flag.String("xlsxSheetName", "", "Xlsx sheet name")
	// csvFile := flag.String("csvFile", "", "Csv file")
	sessionId := flag.String("sessionId", "", "Session id")
	driveId := flag.String("driveId", "", "Drive id")
	workbookId := flag.String("workbookId", "", "Spread sheet id")
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
	s3Ssl := flag.Bool("s3Ssl", false, "s3 ssl")

	flag.Parse()

	commonInput := CommonInput{
		SessionId: sessionId,
		DriveId: driveId,
		WorkbookId: workbookId,
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
		S3Ssl: s3Ssl,
	}

	// Create temp dir
    tempDir, err := os.MkdirTemp("", "temp")
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error creating temp dir: %s", err), false)
	}
	defer os.RemoveAll(tempDir)

	// Convert xlsx to csv
	csvFile := tempDir + "/converted.csv"
	runCommandConvertXlsxToCsv(*xlsxFile, *xlsxSheetName, csvFile)

    // Open the CSV file
    firstFile, err := os.Open(csvFile)
    if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error opening CSV file: %s", err), false)
    }
    defer firstFile.Close()

    reader := csv.NewReader(bufio.NewReader(firstFile))

    // Check the file
    headers, err := reader.Read()
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error reading CSV file: %s", err), false)
	}
	if len(headers) == 0 {
		emitErrorAndExit(0, "Spreadsheet is empty or contains no header row", true)
	}
	realIdColIndex := -1
	isMissedIdColumn := false
	selectedColIndexes := make([]string, 0)
	for index, header := range headers {
		header := strings.TrimSpace(header)
		if header != "" {
			if header == schema.OriginalPrimaryFieldName {
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
		trimmedFilePath:= tempDir + "/trimmed.csv"
		// Trim the file (select only non-empty columns)
		runCommandTrimFile(selectedColIndexes, csvFile, trimmedFilePath)
		firstFile.Close()
		// Assign reader, filePath to the new (trimmed) file
		trimmedFile, err := os.Open(trimmedFilePath)
		if err != nil {
			emitErrorAndExit(0, fmt.Sprintf("Error opening CSV file: %s", err), false)
		}
		defer trimmedFile.Close()
		reader = csv.NewReader(bufio.NewReader(trimmedFile))
		reader.Read() // Skip the header row
		csvFile = trimmedFilePath
	}

	headers = normalizedHeaderForCsvFile(csvFile, tempDir)

	// infer schema
	// schemaFilePath := tempDir + "/schema.json"
	schemaBytes := runCommandInferSchema(csvFile)

	headerIndexes := getHeaderIndex(headers)
	tableSchema := GetSchema(schemaBytes, headerIndexes)

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
	go writeAndUploadParquet(writeChan, fieldSchemaMap, tempDir, &commonInput, &s3Input, &afterProcessWg)
	afterProcessWg.Add(1)
	go uploadSchema(tableSchema, s3.S3HandlerConfig{
		Endpoint:  *s3Input.S3Endpoint,
		Region:    *s3Input.S3Region,
		AccessKey: *s3Input.S3AccessKey,
		SecretKey: *s3Input.S3SecretKey,
		Bucket:    *s3Input.S3Bucket,
		SSl: *s3Input.S3Ssl,
	}, *commonInput.DataSourceId, *commonInput.SyncVersion, &afterProcessWg)

	if (isMissedIdColumn) {
		// title id column
		fixIdChan <- &FixIdData{
			RowId: schema.OriginalPrimaryFieldName,
			RowIndex: 0,
		}
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
			emitErrorAndExit(0, fmt.Sprintf("Error reading CSV file: %s", err), false)
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
	fmt.Println("Download execution time:", elapsed)
}

// Worker to process lines
func processLines(lines <-chan *LineData, writeChan chan<- []*string, fixIdChan chan<- *FixIdData, fieldSchemaMap map[int]schema.FieldSchema, tableSchema schema.TableSchema, isCreatedIdCol bool, commonInput *CommonInput, wg *sync.WaitGroup) {
    defer wg.Done()
	
	location, err := time.LoadLocation(*commonInput.TimeZone)
    if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error loading location: %s", err), false)
    }

	idColIndex := tableSchema[schema.HashedPrimaryField].Index
	emptyValue := ""

	writeDataLen := len(tableSchema)
    for line := range lines {
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
			curId := strings.TrimSpace(line.Data[idColIndex])
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

	batchSize := 40000
	batchData := make([]FixIdData, 0, batchSize)
	var batchGroup sync.WaitGroup

	for data := range fixIds {
		batchData = append(batchData, *data)
		if len(batchData) == batchSize {
			batchGroup.Add(1)
			go processBatchExcelFixId(batchData, idColIndex, batchSize, commonInput, &batchGroup)

			// end batch
			batchData = make([]FixIdData, 0, batchSize)
		}
    }

	if len(batchData) > 0 {
		batchGroup.Add(1)
		go processBatchExcelFixId(batchData, idColIndex, batchSize, commonInput, &batchGroup)
	}

	batchGroup.Wait()

	fmt.Println("Finish fixing id column")
}

func writeAndUploadParquet(dataChan <-chan []*string, fieldSchemaMap map[int]schema.FieldSchema, tempDirPath string, commonInput *CommonInput, s3Config *S3Input, wg *sync.WaitGroup) {
	defer wg.Done()
	fmt.Printf("Start writing parquet\n")

	// init parquet writer
	pqSchema := make([]string, len(fieldSchemaMap))
	for index, field := range fieldSchemaMap {
		pqSchema[index] = fmt.Sprintf("name=%s, type=BYTE_ARRAY, convertedtype=UTF8", field.Id)
	}

	parquetFilePath := tempDirPath + "/data.parquet"
	fw, err := local.NewLocalFileWriter(parquetFilePath)
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Can't create local file writer: %s", err), false)
	}
	defer fw.Close()
	pw, err := writer.NewCSVWriter(pqSchema, fw, 4)
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Can't create parquet writer: %s", err), false)
	}

	for data := range dataChan {
		if err := pw.WriteString(data); err != nil {
			emitErrorAndExit(0, fmt.Sprintf("Can't write parquet: %s", err), false)
		}
	}

	// stop parquet writer
	if err = pw.WriteStop(); err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Can't stop parquet writer: %s", err), false)
	}

	fmt.Printf("Finish writing parquet\n")

	uploadData(parquetFilePath, s3.S3HandlerConfig{
		Endpoint:  *s3Config.S3Endpoint,
		Region:    *s3Config.S3Region,
		AccessKey: *s3Config.S3AccessKey,
		SecretKey: *s3Config.S3SecretKey,
		Bucket:    *s3Config.S3Bucket,
		SSl: *s3Config.S3Ssl,
	}, *commonInput.DataSourceId, *commonInput.SyncVersion)

	fmt.Printf("Finish uploading parquet\n")
}

func GetSchema(schemaBytes []byte, headerIndexes map[string]int) (*schema.TableSchema) {
	isMissedIdCol := true

	// jsonFile, err := os.Open(schemaFilePath)
    // if err != nil {
		// emitErrorAndExit(0, fmt.Sprintf("Error opening schema file: %s", err), false)
    // }
    // defer jsonFile.Close()

    // // Read the file content
    // byteValue, err := io.ReadAll(jsonFile)
    // if err != nil {
		// emitErrorAndExit(0, fmt.Sprintf("Error reading schema file: %s", err), false)
    // }

    // Use jsoniter to unmarshal the byte value into the struct
    var json = jsoniter.ConfigCompatibleWithStandardLibrary
	var schemaFile MarshaledSchemaFile
    err := json.Unmarshal(schemaBytes, &schemaFile)
    if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error unmarshalling schema file: %s", err), false)
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
						emitErrorAndExit(0, fmt.Sprintf("Encountered unsupported type: %s", field.Type[0]), false)
					case "object":
						emitErrorAndExit(0, fmt.Sprintf("Encountered unsupported type: %s", field.Type[0]), false)
					default:
						emitErrorAndExit(0, fmt.Sprintf("Encountered unsupported type: %s", field.Type[0]), false)
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
		newSchemaField.Index = maxFieldIndex + 1
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

func processBatchExcelFixId(batchData []FixIdData, idColIndex int, batchSize int, commonInput *CommonInput, wg *sync.WaitGroup) {
	defer wg.Done()

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
	updateData := generateExcelUpdateIdData(updateBatches, *commonInput.SheetName, idColIndex)
	updateExcelIdColumns(updateData, commonInput)
}

func generateExcelUpdateIdData(data UpdateIdData, sheetName string, idColIndex int) map[string][]byte {
	idColIndex++
	result := make(map[string][]byte)
	for firstRowNumber, values := range data {
		formattedValues := make([][]string, len(values))
		for i, val := range values {
			formattedValues[i] = []string{val}
		}
		rangeAddress := convertToA1Notation(firstRowNumber+1, idColIndex) + ":" + convertToA1Notation(firstRowNumber+len(values), idColIndex)
		json := struct {
			Values [][]string `json:"values"`
		}{
			Values: formattedValues,
		}
		jsonByte, err := jsoniter.Marshal(json)
		if err != nil {
			emitErrorAndExit(0, fmt.Sprintf("Error marshal json batch data: %s", err), false)
		}
		result[rangeAddress] = jsonByte
	}
	return result
}

func uploadSchema(schema *schema.TableSchema, s3Config s3.S3HandlerConfig, dataSourceId string, syncVersion string, wg *sync.WaitGroup) {
	defer wg.Done()

	fmt.Printf("Uploading schema\n")

	schemaJson, err := jsoniter.Marshal(*schema)
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error when marshalling schema: %+v", err), false)
	}
	handler, err := s3.NewHandlerWithConfig(&s3Config)
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error when initializing s3 handler: %+v", err), false)
	}
	schemaFileKey := fmt.Sprintf("schema/%s-%s.json", dataSourceId, syncVersion)
	err = handler.UploadFileWithBytes(schemaFileKey, schemaJson, nil)
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error when uploading schema to s3: %+v", err), false)
	}

	fmt.Printf("Finish uploading schema\n")
}

func uploadData(dataFilePath string, s3Config s3.S3HandlerConfig, dataSourceId string, syncVersion string) error {
	handler, err := s3.NewHandlerWithConfig(&s3Config)
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error when initializing s3 handler: %+v", err), false)
	}
	dataFileKey := fmt.Sprintf("data/%s-%s.parquet", dataSourceId, syncVersion)
	err = handler.UploadFile(dataFileKey, dataFilePath)
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error when uploading data to s3: %+v", err), false)
	}
	return nil
}

func parseDate(dateStr string, location *time.Location) string {
    if t, err := time.ParseInLocation(DateLayout, dateStr, location); err == nil {
		return t.UTC().Format(DateOutputLayout)
    }

    if t, err := time.ParseInLocation(DateTimeLayout, dateStr, location); err == nil {
        return t.UTC().Format(DateOutputLayout)
    }

	return ErrorValue
}

func runCommandConvertXlsxToCsv(xlsxFilePath string, sheetName string, outputFilePath string) {
	cmd := exec.Command(
		"/usr/local/bin/qsv",
		"excel", "--flexible", "--date-format", "%Y-%m-%dT%H:%M:%SZ",
		"-s", sheetName,
		"-o", outputFilePath,
		xlsxFilePath,
	)
	err := cmd.Run()
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error when running convert xlsx command: %+v", err), false)
	}
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
		emitErrorAndExit(0, fmt.Sprintf("Error when running trim file command: %+v", err), false)
	}
}

func runCommandInferSchema(csvFilePath string) []byte {
	// outFile, err := os.Create(outputFilePath)
	// if err != nil {
		// emitErrorAndExit(0, fmt.Sprintf("Error creating schema file: %+v", err), false)
	// }
	// defer outFile.Close()
	var result bytes.Buffer

	cmd := exec.Command(
		"/usr/local/bin/qsv",
		"schema",
		"--dates-whitelist", "all",
		"--enum-threshold", "0",
		"--strict-dates",
		"--stdout",
		csvFilePath,
	)
	cmd.Stdout = &result
	err := cmd.Run()
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error when running infer schema command: %+v", err), false)
	}

	return result.Bytes()
}

func emitErrorAndExit(code int, message string, isExternal bool) {
	errorMutex.Lock()
	err := excel.DownloadError{
		Code: 	 code,
		Msg: 	 message,
		IsExternal: isExternal,
	}
	errJson, _ := jsoniter.Marshal(err)
    os.Stderr.Write(errJson)
	os.Exit(1)
}

func convertToA1Notation(row, column int) string {
	columnStr := ""
	unit := (column - 1) % 26
	columnStr = string('A'+unit) + columnStr
	for column > 26 {
		column = (column - 1) / 26
		unit = (column - 1) % 26
		columnStr = string('A'+unit) + columnStr
	}
	rowStr := strconv.Itoa(row)
	result := columnStr + rowStr
	return result
}

func updateExcelIdColumn(rangeAddress string, data []byte, commonInput *CommonInput, wg *sync.WaitGroup) {
	defer wg.Done()
	fmt.Println("Updating range: ", rangeAddress)

	var url string
	if *commonInput.DriveId == "" {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/me/drive/items/%s/workbook/worksheets/%s/range(address='%s')?$select=address", *commonInput.WorkbookId, *commonInput.SheetId, rangeAddress)
	} else {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/drives/%s/items/%s/workbook/worksheets/%s/range(address='%s')?$select=address", *commonInput.DriveId, *commonInput.WorkbookId, *commonInput.SheetId, rangeAddress)
	}
	req, err := http.NewRequest("PATCH", url, bytes.NewReader(data))
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error when creating request: %s", err), false)
	}
	req.Header.Set("Authorization", "Bearer " + *commonInput.AccessToken)
	req.Header.Set("workbook-session-id", *commonInput.SessionId)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error when updating excel id column: %s", err), false)
	}

	defer resp.Body.Close()
	responseBody, err := io.ReadAll(resp.Body)

	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error reading response body from excel update id column: %s", err), false)
	}

	if !(resp.StatusCode >= 200 && resp.StatusCode < 300) {
		var errRes excel.ErrorResponse
		err := jsoniter.Unmarshal(responseBody, &errRes)
		if err != nil {
			emitErrorAndExit(0, fmt.Sprintf("Error unmarshalling: %s", err), false)
		}
		externalErr := excel.WrapWorksheetApiError(resp.StatusCode, errRes.Error.Msg)
		emitErrorAndExit(externalErr.Code, externalErr.Msg, true)
	}
}

func updateExcelIdColumns(data map[string][]byte, commonInput *CommonInput) {
	var wg sync.WaitGroup
	for rangeAddress, json := range data {
		wg.Add(1)
		go updateExcelIdColumn(rangeAddress, json, commonInput, &wg)
	}
	wg.Wait()
}

func normalizedHeaderForCsvFile(csvFilePath string, csvFileDir string) []string {
	originalFile, err := os.Open(csvFilePath)
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error opening CSV file: %s", err), false)
	}
	defer originalFile.Close()

	// Create a temporary file
	tempFile, err := os.CreateTemp(csvFileDir, "header")
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error creating temp file: %s", err), false)
	}
	defer tempFile.Close()

	reader := bufio.NewReader(originalFile)

	firstRowBytes, err := reader.ReadBytes('\n')
	csvReader := csv.NewReader(bytes.NewReader(firstRowBytes))
	headers, err := csvReader.Read()
	if err != nil && err != io.EOF {
		emitErrorAndExit(0, fmt.Sprintf("Error reading CSV file: %s", err), false)
	}

	// TODO: dedupe header
	existedFieldName := make(map[string]bool)
	newHeaders := make([]string, len(headers))
	for index, originalFieldName := range headers {
		fieldName := strings.TrimSpace(originalFieldName)
		if _, exists := existedFieldName[fieldName]; exists {
			if fieldName == schema.OriginalPrimaryFieldName {
				emitErrorAndExit(0, fmt.Sprintf("Primary field name %s is duplicated", fieldName), true)
			}
			dedupe_number := 1
			for {
				newName := fmt.Sprintf("%s (%d)", fieldName, dedupe_number)
				if _, exists := existedFieldName[newName]; !exists {
					fieldName = newName
					break
				}
				dedupe_number += 1
			}
		}
		existedFieldName[fieldName] = true
		fmt.Printf("fieldName: %s\n", fieldName)
		newHeaders[index] = fieldName
	}

	// Write the new header
	_, err = tempFile.WriteString(strings.Join(newHeaders, ",") + "\n")
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error writing to temp file: %s", err), false)
	}

	// Write the rest of the file
	_, err = io.Copy(tempFile, reader)
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error writing to temp file: %s", err), false)
	}

	// replace original file with temp file
	err = os.Rename(tempFile.Name(), csvFilePath)
	if err != nil {
		emitErrorAndExit(0, fmt.Sprintf("Error replacing original file with temp file: %s", err), false)
	}

	return newHeaders
}