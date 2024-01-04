package google_sheets

import (
	"fmt"

	jsoniter "github.com/json-iterator/go"
)

func GetSpreadSheetFileS3Key(spreadsheetId string) string {
	return fmt.Sprintf("data/%s.xlsx", spreadsheetId)
}

func SerializeSpreadsheetFileMetadata(metadata SpreadsheetMetadata) (map[string]*string, error) {
	sheetsMetadataJson, err := jsoniter.MarshalToString(metadata.Sheets)
	if err != nil {
		return nil, err
	}
	result := map[string]*string{
		"Spreadsheet_id":      &metadata.SpreadsheetId,
		"Spreadsheet_version": &metadata.SpreadsheetVersion,
		"Timezone":            &metadata.TimeZone,
		"Sheets":              &sheetsMetadataJson,
	}
	return result, nil
}

func DeserializeSpreadsheetFileMetadata(fileMetadata map[string]*string) (*SpreadsheetMetadata, error) {
	sheets := make(map[string]SheetsMetadata)
	err := jsoniter.UnmarshalFromString(*fileMetadata["Sheets"], &sheets)
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
