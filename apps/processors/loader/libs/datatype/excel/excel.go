package excel

import (
	"loader/libs/schema"
)

type ExcelDataType string

const (
	String  ExcelDataType = "String"
	Number  ExcelDataType = "Number"
	Logical ExcelDataType = "Logical"
	Error   ExcelDataType = "Error"
)

var ExcelTypeMap = map[ExcelDataType]schema.DataType{
	String:  schema.String,
	Number:  schema.Number,
	Error:   schema.String,
	Logical: schema.Boolean,
}
