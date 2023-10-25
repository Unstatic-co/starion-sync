package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	jsoniter "github.com/json-iterator/go"
	"github.com/samber/lo"

	"golang.org/x/oauth2"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"
)

const (
	nanosInADay         = float64((24 * time.Hour) / time.Nanosecond)
	defaultReplaceEmpty = "__StarionSyncNull"
	defaultReplaceError = "__Error"
)

var json = jsoniter.ConfigCompatibleWithStandardLibrary

// UTILS

// return 0 for empty, -1 for error
func toFloat(unk any) (float64, error) {
	switch v := unk.(type) {
	case int:
		return float64(v), nil
	case int8:
		return float64(v), nil
	case int16:
		return float64(v), nil
	case int32:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case uint:
		return float64(v), nil
	case uint8:
		return float64(v), nil
	case uint16:
		return float64(v), nil
	case uint32:
		return float64(v), nil
	case uint64:
		return float64(v), nil
	case float32:
		return float64(v), nil
	case float64:
		return float64(v), nil
	case string:
		// return strconv.ParseFloat(v, 64)
		if v == "" {
			return 0, nil
		}
		return -1, fmt.Errorf("%+v is not convertible to float", unk)
	default:
		return -1, fmt.Errorf("%+v is not convertible to float", unk)
	}
}
func convertSerialNumberToDate(serialNumber float64, timezone string, replaceEmpty string) string {
	if serialNumber == 0 {
		return replaceEmpty
	}

	location, err := time.LoadLocation(timezone)
	if err != nil {
		log.Fatalf("Cannot load timezone %s: %+v", timezone, err)
	}

	anchorTime := time.Date(1899, time.December, 30, 0, 0, 0, 0, location)
	offsetFractionsNs := serialNumber*nanosInADay - float64(int64(serialNumber))*nanosInADay

	return anchorTime.
		AddDate(0, 0, int(serialNumber)).
		Add(time.Duration(offsetFractionsNs)).
		UTC().
		Format("2006-01-02T15:04:05.999Z")
}

// END UTILS
type GoogleSheetsService struct {
	SpreadsheetId string `json:"spreadsheetId"`
	SheetId       string `json:"sheetId"`
	SheetName     string `json:"sheetName"`
	AccessToken   string `json:"accessToken"`
}
type GetValueOfExcelColumnResponse struct {
	Values []interface{} `json:"values"`
}

func GetValuesOfGoogleSheetsColumns(ctx context.Context, s *GoogleSheetsService, columns []int, rowNumber int) ([]*sheets.ValueRange, error) {
	token := oauth2.Token{
		AccessToken: s.AccessToken,
	}
	tokenSource := oauth2.StaticTokenSource(&token)
	client, err := sheets.NewService(ctx, option.WithTokenSource(tokenSource))
	if err != nil {
		log.Fatalln("Error when creating client to fetch date data", err)
	}

	allRanges := lo.Map(
		columns,
		func(idx int, _ int) string {
			return fmt.Sprintf("%s!R2C%[2]d:R%dC%[2]d", s.SheetName, idx, 1+rowNumber)
		},
	)

	resp, err := client.Spreadsheets.Values.BatchGet(s.SpreadsheetId).
		MajorDimension("COLUMNS").
		Ranges(allRanges...).
		DateTimeRenderOption("SERIAL_NUMBER").
		ValueRenderOption("UNFORMATTED_VALUE").
		Do()
	if err != nil {
		log.Fatalf("Cannot get column data: %+v", err)
	}

	return resp.ValueRanges, nil
}

func main() {
	// startTime := time.Now()
	// defer printExecutionTime(startTime)

	spreadsheetId := flag.String("spreadsheetId", "", "Spreadsheets Id")
	sheetId := flag.String("sheetId", "", "Sheet Id")
	sheetName := flag.String("sheetName", "", "Sheet Name")
	accessToken := flag.String("accessToken", "", "Microsoft graph api Access Token")
	columnIndexs := flag.String("colIndexes", "", "Number index of datetime columns, start at 1")
	numberOfRows := flag.Int("rowNumber", 0, "Number of row (include header))")
	timezone := flag.String("timezone", "UTC", "Timezone of worksheet")
	replaceEmpty := flag.String("replaceEmpty", defaultReplaceEmpty, "value replaced for empty cell")
	replaceError := flag.String("replaceError", defaultReplaceError, "value replaced for date error cell")
	out := flag.String("out", "-", "Output path, - to output to stdin")

	flag.Parse()

	ctx := context.Background()

	// output writer
	var writer *os.File
	if *out == "-" {
		writer = os.Stdout
	} else {
		var err error
		writer, err := os.Create(*out)
		if err != nil {
			log.Fatalln("Cannot open file in path: ", *out)
		}
		defer writer.Close()
	}

	service := GoogleSheetsService{
		SpreadsheetId: *spreadsheetId,
		SheetId:       *sheetId,
		SheetName:     *sheetName,
		AccessToken:   *accessToken,
	}

	columnIndexesList := strings.Split(*columnIndexs, ",")
	columnIndexes := lo.Map(columnIndexesList, func(value string, _ int) int {
		index, err := strconv.Atoi(value)
		if err != nil {
			log.Fatalln("Error parsing column index")
		}
		return index
	})

	serialNumberDateColumnValues, err := GetValuesOfGoogleSheetsColumns(ctx, &service, columnIndexes, *numberOfRows)
	if err != nil {
		log.Fatalln("Error getting values of date columns: ", err)
	}

	for row := 0; row < *numberOfRows; row++ {
		rowStrings := make([]string, len(columnIndexes))
		for idx, col := range serialNumberDateColumnValues {
			if row >= len(col.Values[0]) {
				rowStrings[idx] = *replaceEmpty
				continue
			} else if val, err := toFloat(col.Values[0][row]); err != nil {
				rowStrings[idx] = *replaceError
			} else if val == 0 {
				rowStrings[idx] = *replaceEmpty
			} else {
				rowStrings[idx] = convertSerialNumberToDate(val, *timezone, *replaceEmpty)
			}
		}
		rowString := strings.Join(rowStrings, ",")
		// print to output
		fmt.Fprintln(writer, rowString)
	}
}
