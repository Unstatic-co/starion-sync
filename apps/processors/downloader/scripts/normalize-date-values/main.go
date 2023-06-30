package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	jsoniter "github.com/json-iterator/go"
	"github.com/samber/lo"
)

const (
	nanosInADay = float64((24 * time.Hour) / time.Nanosecond)
)

var json = jsoniter.ConfigCompatibleWithStandardLibrary

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
		return strconv.ParseFloat(v, 64)
	default:
		return 0, fmt.Errorf("%+v is not convertible to float", unk)
	}
}

func convertSerialNumberToDate(serialNumber float64) string {
	anchorTime := time.Date(1899, time.December, 30, 0, 0, 0, 0, time.UTC)
	offsetFractionsNs := serialNumber*nanosInADay - float64(int64(serialNumber))*nanosInADay

	return anchorTime.
		AddDate(0, 0, int(serialNumber)).
		Add(time.Duration(offsetFractionsNs)).
		UTC().
		Format("2006-01-02 15:04:05")
}

type MicrosoftExcelService struct {
	DriveId     string `json:"driveId"`
	WorkbookId  string `json:"workbookId"`
	WorksheetId string `json:"worksheetId"`
	AccessToken string `json:"accessToken"`
}
type GetValueOfExcelColumnResponse struct {
	Values []interface{} `json:"values"`
}

func (s *MicrosoftExcelService) GetValuesOfExcelColumn(columnIndex int) ([]string, error) {
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/me/drive/items/%s/workbook/worksheets/%s/range/usedRange/column(column=%d)?$select=values", s.WorkbookId, s.WorksheetId, columnIndex)
	client := &http.Client{}
	request, _ := http.NewRequest("GET", url, nil)
	request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.AccessToken))
	response, err := client.Do(request)
	if err != nil {
		log.Fatalln("Error fetching values of date columns")
		return nil, err
	}

	var resValue GetValueOfExcelColumnResponse
	err = json.NewDecoder(response.Body).Decode(&resValue)
	if err != nil {
		log.Fatalln("Error parsing values of date columns")
		return nil, err
	}

	result := lo.Map(resValue.Values, func(value interface{}, _ int) string {
		return value.([]string)[0]
	})

	return result, nil
}

func main() {
	driveId := flag.String("driveId", "", "Drive Id")
	workbookId := flag.String("workbookId", "8990834B23946C10!127", "Workbook Id")
	worksheetId := flag.String("worksheetId", "{00000000-0001-0000-0000-000000000000}", "Worksheet Id")
	// worksheetName := flag.String("worksheetName", "", "Worksheet Name")
	accessToken := flag.String("accessToken", "EwBYA8l6BAAUAOyDv0l6PcCVu89kmzvqZmkWABkAAYbsafaPzllSCoMf4Rw3IDOrCRBQCzK50P7nUy1RENFQnv+FBdjEPQf/53rOeFQ3gaI7xVDpudKkh3zTK3cpe8Zjf2Y7R60Fp0wmB3kR7TQ7CjOJDBqDfMnw/wBwFriy56SJGL6IAT6SHOqDXDx0DmgFqyfL9MWqI8H/gTB9fk3OLL1ts6stJl29Y0wYSn5kz4Rnljo27gOYk/e9Rc3Qha+3+0I8qeSyPDuOFcpOX+MB7yUYnb8JkFEvraZnNnBGYajWz/UbLSSQkP2QRyIYgXQZtC2jyffGvVvlrhlcb4M0xcNkFPysJfum1XFgkS6hs1Qv7+nqrvStlRY2M7oklGQDZgAACG3C2IQtot4NKAKf+JyL897VNZETctbFVZAK8kiC0MyfSAQpv8ZMKSNClr2uowuvpnNTAsNGVPsmoS36yMJC4Zih0XQuEZopq5CWY8OHg97VLJIrfywFSQRVU1vnDyJJ52VDDIdK5YRUXeEw1JqODbFMmNKrw+TfaCCIyt6XqmC350aN/fQtP+Xc1oOdk9aK2gc1Ry1yAgzpu72oF2Fr76Gwr25puqy8zBg0qaMrDXTaPX6M+x13+yE8KA4HK4w/QqgGNPLOV+TfXWOHu+8qU6nAgQaR57ier6F9FHPUfKcpQcTXPqPnfGfijhpvxGVecn7cHIzfprfXqMpNV4f04698jTPNkOMfkjHntQy5vU3q4HpBe4TUi14PiXscBsDZTFg/Ob2eg9nMYPzULX7k9x2CAQw44s0tXY+5m7CJTMaxeqscrkyuTu1H4vedL95wGtwjthwaks4gvuwQEajOmmJ43k5uey3uBcknyXQw7UHEN442qciPBiYGGRE8FP/TPRPhyrFGl3naPx65bD9O24oES3WXyy4xcHsSiJFAq3fkl3UtbXSw29tlsISN+XyLRKtIbQjaenCyHm31NVvz8QbWyiKA50MFRzMx2F4xNDElioo46HF3he05cpAH81aLLRl9AgVke+P8de6EPXn9sIkjlYDmcz3J5X6r6X2f1rGKV44dOHeQJsaDiTdEfdZc9TavCcQMKH6RIg42lNtyrITFaik7wuLYUc9rFFY5eH8AlyFsAg==", "Microsoft graph api Access Token")

	flag.Parse()

	fmt.Println("workbookId:", *workbookId)

	service := MicrosoftExcelService{
		DriveId:     *driveId,
		WorkbookId:  *workbookId,
		WorksheetId: *worksheetId,
		AccessToken: *accessToken,
	}

	result, err := service.GetValuesOfExcelColumn(2)
	if err != nil {
		log.Fatalln("Error getting values of date columns")
	}

	for _, value := range result {
		fmt.Println(value)
	}
}
