package google_sheets

type SheetsMetadata struct {
	SheetId    string `json:"sheet_id"`
	SheetIndex int64  `json:"sheet_index"`
	SheetName  string `json:"sheet_name"`
	XlsxSheetName string `json:"xlsx_sheet_name"`
}

type SpreadsheetMetadata struct {
	SpreadsheetId      string                    `json:"spreadsheet_id"`
	SpreadsheetVersion string                    `json:"spreadsheet_version"`
	TimeZone           string                    `json:"time_zone"`
	Sheets             map[string]SheetsMetadata `json:"sheets"` // sheetId -> SheetMetadata
}

type SpreadsheetFileMetadata struct {
	SpreadsheetId      string `json:"spreadsheet_id"`
	SpreadsheetVersion string `json:"spreadsheet_version"`
	TimeZone           string `json:"time_zone"`
	Sheets             string `json:"sheets"` // sheetId -> SheetMetadata (json string)
}
