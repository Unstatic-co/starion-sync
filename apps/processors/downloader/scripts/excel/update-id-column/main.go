package main

import (
	"bytes"
	"encoding/csv"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"

	jsoniter "github.com/json-iterator/go"
)

const MAX_BATCH_SIZE = 20000

// UTILS
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
func generateUpdateIdData(idsFile string, includeHeader bool) map[int][]string {
	// open file CSV
	file, err := os.Open(idsFile)
	if err != nil {
		log.Fatalln("Error opening ids file: ", err, " at path: ", idsFile)
	}
	defer file.Close()

	reader := csv.NewReader(file)

	// setup csv reader
	reader.Comma = ','
	reader.FieldsPerRecord = 2

	data := make(map[int][]string)

	// read header
	idsFileHeader, err := reader.Read()
	if err != nil {
		log.Fatalln("Error first line of ids file: ", err)
	}
	idColName := idsFileHeader[0]

	var currentFirstRowNumber int
	var prevRowNumber int
	var batchData []string

	if includeHeader {
		currentFirstRowNumber = 1
		prevRowNumber = 1
		batchData = []string{idColName}
	} else {
		currentFirstRowNumber = 2
		prevRowNumber = 2
		batchData = []string{}
	}

	for {
		record, err := reader.Read()
		if err != nil {
			if err.Error() == "EOF" {
				// save last batch
				data[currentFirstRowNumber] = batchData
				break
			}
			log.Fatalln("Error reading ids record: ", err)
		}

		id := record[0]
		rowNumber := record[1]

		rowNumberInt, _ := strconv.Atoi(rowNumber)
		if prevRowNumber+1 == rowNumberInt && len(batchData) < MAX_BATCH_SIZE {
			// continue batch
			batchData = append(batchData, id)
		} else {
			// end old batch
			data[currentFirstRowNumber] = batchData
			// new batch
			currentFirstRowNumber = rowNumberInt
			batchData = []string{id}
		}
		prevRowNumber = rowNumberInt
	}

	return data
}
func generateUpdateDataInJson(data map[int][]string, idColIndex int) map[string][]byte {
	result := make(map[string][]byte)
	for firstRowNumber, values := range data {
		formattedValues := make([][]string, len(values))
		for i, val := range values {
			formattedValues[i] = []string{val}
		}
		rangeAddress := convertToA1Notation(firstRowNumber, idColIndex) + ":" + convertToA1Notation(firstRowNumber+len(values)-1, idColIndex)
		json := struct {
			Values [][]string `json:"values"`
		}{
			Values: formattedValues,
		}
		jsonByte, err := jsoniter.Marshal(json)
		if err != nil {
			log.Fatalln("Error marshal json batch data: ", err)
		}
		result[rangeAddress] = jsonByte
	}
	return result
}

// END: UTILS

// SERVICE
type MicrosoftExcelService struct {
	DriveId     string `json:"driveId"`
	WorkbookId  string `json:"workbookId"`
	WorksheetId string `json:"worksheetId"`
	AccessToken string `json:"accessToken"`
	SessionId   string `json:"sessionId"`
}

func (s *MicrosoftExcelService) UpdateIdColumn(rangeAddress string, data []byte, wg *sync.WaitGroup, errors chan<- error) {
	log.Println("Updating range: ", rangeAddress)
	var url string
	if s.DriveId == "" {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/me/drive/items/%s/workbook/worksheets/%s/range(address='%s')?$select=address", s.WorkbookId, s.WorksheetId, rangeAddress)
	} else {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/drives/%s/items/%s/workbook/worksheets/%s/range(address='%s')?$select=address", s.DriveId, s.WorkbookId, s.WorksheetId, rangeAddress)
	}
	defer wg.Done()
	req, err := http.NewRequest("PATCH", url, bytes.NewReader(data))
	if err != nil {
		errors <- err
		return
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("workbook-session-id", s.SessionId)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		errors <- err
		return
	}

	// // log response body
	// body, err := ioutil.ReadAll(resp.Body)
	// log.Println("Response body: ", string(body))

	if resp.StatusCode != http.StatusOK {
		errors <- fmt.Errorf("Request failed with status code: %d", resp.StatusCode)
		return
	}
	defer resp.Body.Close()
}
func (s *MicrosoftExcelService) UpdateIdColumns(data map[string][]byte) {
	var wg sync.WaitGroup
	errors := make(chan error, len(data))
	for rangeAddress, json := range data {
		wg.Add(1)
		go s.UpdateIdColumn(rangeAddress, json, &wg, errors)
	}

	wg.Wait()
	close(errors)

	if len(errors) > 0 {
		for err := range errors {
			log.Printf("Request failed with error: %s\n", err.Error())
		}
		os.Exit(1)
		return
	}
}

// END: SERVICE

func main() {
	driveId := flag.String("driveId", "", "Drive Id")
	workbookId := flag.String("workbookId", "", "Workbook Id")
	worksheetId := flag.String("worksheetId", "", "Worksheet Id")
	accessToken := flag.String("accessToken", "", "Microsoft graph api Access Token")
	sessionId := flag.String("sessionId", "", "Workbook session Id")
	idColIndex := flag.Int("idColIndex", 0, "The index of id column")
	idsFile := flag.String("idsFile", "", "The file contained ids for missing rows")
	includeHeader := flag.Bool("includeHeader", false, "Specify if should add header for id row")

	flag.Parse()

	service := MicrosoftExcelService{
		DriveId:     *driveId,
		WorkbookId:  *workbookId,
		WorksheetId: *worksheetId,
		AccessToken: *accessToken,
		SessionId:   *sessionId,
	}

	data := generateUpdateIdData(*idsFile, *includeHeader)

	jsonData := generateUpdateDataInJson(data, *idColIndex)

	service.UpdateIdColumns(jsonData)
}
