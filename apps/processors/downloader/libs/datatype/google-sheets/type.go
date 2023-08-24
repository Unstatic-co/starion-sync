package excel

import (
	"downloader/libs/schema"
)

type GoogleSheetsDataType string

const (
	String  GoogleSheetsDataType = "String"
	Number  GoogleSheetsDataType = "Number"
	Logical GoogleSheetsDataType = "Logical"
	Error   GoogleSheetsDataType = "Error"
)

var GoogleSheetTypeMap = map[GoogleSheetsDataType]schema.DataType{
	String:  schema.String,
	Number:  schema.Number,
	Error:   schema.String,
	Logical: schema.Boolean,
}
