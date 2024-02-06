package util

import (
	"bytes"
	"fmt"
	"log"
	"strings"

	excelize "github.com/xuri/excelize/v2"
)

// func NormalizeSheetName(sheetName string) string {
// // Remove characters: / \ ? * : [ ]
// regex := regexp.MustCompile(`[\/\\?\*\:\[\]]`)
// sheetName = regex.ReplaceAllString(sheetName, "")

// if len(sheetName) > 31 {
// return sheetName[:31]
// }
// return sheetName
// }

func FormatSheetNameInRange(sheetName string) string {
	return fmt.Sprintf("'%s'", strings.ReplaceAll(sheetName, "'", "''"))
}

func GetSheetNamesFromXlsxData(fileBytes []byte) []string {
	var sheetNames []string

	// Open the Excel file
	xlsx, err := excelize.OpenReader(bytes.NewReader(fileBytes))
	if err != nil {
		log.Fatal(err)
	}

	// Get all sheet names
	sheetList := xlsx.GetSheetList()

	// Iterate through sheet names and print them
	for _, sheetName := range sheetList {
		sheetNames = append(sheetNames, sheetName)
	}

	return sheetNames
}