package main

import (
	"context"
	"encoding/csv"
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"

	"golang.org/x/oauth2"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"
)

type UpdateIdData map[int][]string // map[firstRowNumber][]id

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

func generateUpdateIdData(idsFile string, includeHeader bool) UpdateIdData {
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

	return data
}

func generateUpdateIdGoogleSheetsData(data UpdateIdData, sheetName string, idColIndex int) []*sheets.ValueRange {
	result := make([]*sheets.ValueRange, len(data))
	for firstRowNumber, values := range data {
		formattedValues := make([][]interface{}, len(values))
		for i, val := range values {
			formattedValues[i] = []interface{}{val}
		}
		valueRange := fmt.Sprintf("%s!R%[2]dC%[3]d:R%[4]dC%[3]d", sheetName, firstRowNumber, idColIndex, firstRowNumber+len(values)-1)
		result = append(result, &sheets.ValueRange{
			Range:  valueRange,
			Values: formattedValues,
		})
	}
	return result
}

// END: UTILS

// SERVICE
type GoogleSheetsService struct {
	SpreadsheetId string `json:"spreadsheetId"`
	SheetId       string `json:"sheetId"`
	SheetName     string `json:"sheetName"`
	AccessToken   string `json:"accessToken"`
}

// END: SERVICE

func main() {
	spreadsheetId := flag.String("spreadsheetId", "", "Spreadsheets Id")
	sheetId := flag.String("sheetId", "", "Sheet Id")
	sheetName := flag.String("sheetName", "", "Sheet Name")
	accessToken := flag.String("accessToken", "", "Microsoft graph api Access Token")
	idColIndex := flag.Int("idColIndex", 0, "The index of id column, start at 1")
	idsFile := flag.String("idsFile", "", "The file contained ids for missing rows")
	includeHeader := flag.Bool("includeHeader", false, "Specify if should add header for id row")

	flag.Parse()

	service := GoogleSheetsService{
		SpreadsheetId: *spreadsheetId,
		SheetId:       *sheetId,
		SheetName:     *sheetName,
		AccessToken:   *accessToken,
	}

	data := generateUpdateIdData(*idsFile, *includeHeader)
	updateData := generateUpdateIdGoogleSheetsData(data, *sheetName, *idColIndex)

	ctx := context.Background()
	token := oauth2.Token{
		AccessToken: service.AccessToken,
	}
	tokenSource := oauth2.StaticTokenSource(&token)
	sheetClient, err := sheets.NewService(ctx, option.WithTokenSource(tokenSource))
	if err != nil {
		log.Fatalln("Error when creating client to update id col", err)
	}

	_, err = sheetClient.Spreadsheets.Values.
		BatchUpdate(service.SpreadsheetId, &sheets.BatchUpdateValuesRequest{
			ValueInputOption:        "RAW",
			Data:                    updateData,
			IncludeValuesInResponse: false,
		}).
		Do()
	if err != nil {
		log.Fatalln("Error when updating id col", err)
	}
}