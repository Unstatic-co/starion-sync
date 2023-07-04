package main

import (
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
	return columnStr + rowStr
}
func generateUpdateIdData(idsFile string) map[int][]string {
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

	currentFirstRowNumber := 1
	prevRowNumber := 1
	batchData := []string{idColName}

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
		if prevRowNumber+1 == rowNumberInt {
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

	log.Println("Batch data: ", data)

	return data
}
func generateUpdateDataInJson(data map[int][]string, idColIndex int) map[string][]byte {
	result := make(map[string][]byte)
	for firstRowNumber, values := range data {
		rangeAddress := convertToA1Notation(firstRowNumber, idColIndex) + ":" + convertToA1Notation(firstRowNumber+len(values)-1, idColIndex)
		json := struct {
			Values []string `json:"values"`
		}{
			Values: values,
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
}

func (s *MicrosoftExcelService) UpdateIdColumn(rangeAddress string, data []byte, wg *sync.WaitGroup) {
	url := ""
	defer wg.Done()
	resp, err := http.Post(url, "application/json", nil)
	if err != nil {
		log.Fatalln("Error making request to %s: %s\n", url, err.Error())
		return
	}
	defer resp.Body.Close()
}
func (s *MicrosoftExcelService) UpdateIdColumns(data map[string][]byte) {
	var wg sync.WaitGroup
	for rangeAddress, json := range data {
		wg.Add(1)
		go s.UpdateIdColumn(rangeAddress, json, &wg)
	}
	wg.Wait()
}

// END: SERVICE

func main() {
	driveId := flag.String("driveId", "", "Drive Id")
	workbookId := flag.String("workbookId", "", "Workbook Id")
	worksheetId := flag.String("worksheetId", "", "Worksheet Id")
	accessToken := flag.String("accessToken", "", "Microsoft graph api Access Token")
	idColIndex := flag.Int("idColIndex", 0, "The index of id column")
	idsFile := flag.String("idsFile", "", "The file contained ids for missing rows")

	flag.Parse()

	service := MicrosoftExcelService{
		DriveId:     *driveId,
		WorkbookId:  *workbookId,
		WorksheetId: *worksheetId,
		AccessToken: *accessToken,
	}

	fmt.Println("service: ", service)

	data := generateUpdateIdData(*idsFile)
	includeHeader := (*idColIndex != -1)
	if includeHeader {
		// remove update header
		delete(data, 1)
	}

	for i, batchValues := range data {
		fmt.Println("batch: ", i, " values: ", batchValues)
	}

	jsonData := generateUpdateDataInJson(data, *idColIndex)

	service.UpdateIdColumns(jsonData)
}
