package google_sheets

import "fmt"

func GetSpreadSheetFileS3Key(spreadsheetId string) string {
	return fmt.Sprintf("data/%s.xlsx", spreadsheetId)
}
