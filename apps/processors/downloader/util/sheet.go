package util

import (
	"fmt"
	"strings"
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