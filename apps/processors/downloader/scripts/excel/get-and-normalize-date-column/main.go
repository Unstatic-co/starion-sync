package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	jsoniter "github.com/json-iterator/go"
	"github.com/samber/lo"
)

const (
	nanosInADay         = float64((24 * time.Hour) / time.Nanosecond)
	defaultReplaceEmpty = "__StarionSyncNull"
)

var json = jsoniter.ConfigCompatibleWithStandardLibrary

// UTILS
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
		return 0, fmt.Errorf("%+v is not convertible to float", unk)
	default:
		return 0, fmt.Errorf("%+v is not convertible to float", unk)
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
type MicrosoftExcelService struct {
	DriveId     string `json:"driveId"`
	WorkbookId  string `json:"workbookId"`
	WorksheetId string `json:"worksheetId"`
	AccessToken string `json:"accessToken"`
	SessionId   string `json:"sessionId"`
}
type GetValueOfExcelColumnResponse struct {
	Values []interface{} `json:"values"`
}

func (s *MicrosoftExcelService) GetValuesOfExcelColumn(columnIndex int) ([]float64, error) {
	var url string
	if s.DriveId == "" {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/me/drive/items/%s/workbook/worksheets/%s/range/usedRange/column(column=%d)?$select=values", s.WorkbookId, s.WorksheetId, columnIndex-1)
	} else {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/drives/%s/items/%s/workbook/worksheets/%s/range/usedRange/column(column=%d)?$select=values", s.DriveId, s.WorkbookId, s.WorksheetId, columnIndex-1)
	}
	client := &http.Client{}
	request, _ := http.NewRequest("GET", url, nil)
	request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.AccessToken))
	request.Header.Set("workbook-session-id", s.SessionId)
	response, err := client.Do(request)
	if err != nil {
		log.Fatalln("Error fetching values of date columns")
		return nil, err
	}

	var resValue GetValueOfExcelColumnResponse
	err = json.NewDecoder(response.Body).Decode(&resValue)
	if err != nil || len(resValue.Values) == 0 {
		log.Fatalln("Error parsing values of date columns")
		return nil, err
	}

	_, resValue.Values = resValue.Values[0], resValue.Values[1:]
	result := lo.Map(resValue.Values, func(value interface{}, _ int) float64 {
		valueArr := value.([]interface{})
		float, err := toFloat(valueArr[0])
		if err != nil {
			return 0
		}
		return float
	})

	return result, nil
}

func GetValuesOfExcelColumnsConcurrently(service *MicrosoftExcelService, columns []int) (map[int][]float64, error) {
	result := make(map[int][]float64)
	ch := make(chan int)
	for _, columnIndex := range columns {
		go func(columnIndex int) {
			values, err := service.GetValuesOfExcelColumn(columnIndex)
			if err != nil {
				log.Fatalln("Error fetching values of date columns")
			}
			result[columnIndex] = values
			ch <- columnIndex
		}(columnIndex)
	}

	for range columns {
		<-ch
	}

	return result, nil
}

func main() {
	// startTime := time.Now()
	// defer printExecutionTime(startTime)

	driveId := flag.String("driveId", "", "Drive Id")
	workbookId := flag.String("workbookId", "", "Workbook Id")
	worksheetId := flag.String("worksheetId", "", "Worksheet Id")
	accessToken := flag.String("accessToken", "", "Microsoft graph api Access Token")
	sessionId := flag.String("sessionId", "", "Workbook session Id")
	columnIndexs := flag.String("colIndexes", "", "Number index of datetime columns, start at 1")
	numberOfRows := flag.Int("rowNumber", 0, "Number of row")
	timezone := flag.String("timezone", "UTC", "Timezone of worksheet")
	replaceEmpty := flag.String("replaceEmpty", defaultReplaceEmpty, "Number of row")
	out := flag.String("out", "-", "Output path, - to output to stdin")

	flag.Parse()

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

	service := MicrosoftExcelService{
		DriveId:     *driveId,
		WorkbookId:  *workbookId,
		WorksheetId: *worksheetId,
		AccessToken: *accessToken,
		SessionId:   *sessionId,
	}

	columnIndexesList := strings.Split(*columnIndexs, ",")
	columnIndexes := lo.Map(columnIndexesList, func(value string, _ int) int {
		index, err := strconv.Atoi(value)
		if err != nil {
			log.Fatalln("Error parsing column index")
		}
		return index
	})

	serialNumberDateValues, err := GetValuesOfExcelColumnsConcurrently(&service, columnIndexes)
	if err != nil {
		log.Fatalln("Error getting values of excel columns: ", err)
	}

	for row := 0; row < *numberOfRows; row++ {
		rowStrings := make([]string, len(columnIndexes))
		for i, colIndex := range columnIndexes {
			rowStrings[i] = convertSerialNumberToDate(serialNumberDateValues[colIndex][row], *timezone, *replaceEmpty)
		}
		rowString := strings.Join(rowStrings, ",")
		// print to output
		fmt.Fprintln(writer, rowString)
	}
}
