package google_sheets

import (
	base64 "encoding/base64"
	"fmt"

	jsoniter "github.com/json-iterator/go"
)

func GetSpreadSheetFileS3Key(dataProviderId string) string {
	return fmt.Sprintf("data/%s.xlsx", dataProviderId)
}

func SerializeSpreadsheetFileMetadata(metadata SpreadsheetMetadata) (map[string]*string, error) {
	sheetsMetadataJson, err := jsoniter.MarshalToString(metadata.Sheets)
	if err != nil {
		return nil, err
	}
	sheetsMetadataBase64 := base64.StdEncoding.EncodeToString([]byte(sheetsMetadataJson))
	result := map[string]*string{
		"Spreadsheet_id":      &metadata.SpreadsheetId,
		"Spreadsheet_version": &metadata.SpreadsheetVersion,
		"Timezone":            &metadata.TimeZone,
		"Sheets":              &sheetsMetadataBase64,
	}
	return result, nil
}

func DeserializeSpreadsheetFileMetadata(fileMetadata map[string]*string) (*SpreadsheetMetadata, error) {
	sheetMetadataByte, err := base64.StdEncoding.DecodeString(*fileMetadata["Sheets"])
	if err != nil {
		return nil, err
	}
	sheets := make(map[string]SheetsMetadata)
	err = jsoniter.Unmarshal(sheetMetadataByte, &sheets)
	if err != nil {
		return nil, err
	}
	return &SpreadsheetMetadata{
		SpreadsheetId:      *fileMetadata["Spreadsheet_id"],
		SpreadsheetVersion: *fileMetadata["Spreadsheet_version"],
		TimeZone:           *fileMetadata["Timezone"],
		Sheets:             sheets,
	}, nil
}
