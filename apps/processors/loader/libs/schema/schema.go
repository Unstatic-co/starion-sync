package schema

const HashedPrimaryField = "f_gfbbfabeggejigfgbfhdcdbecifcjhdd"
const PrimaryFieldName = "__StarionId"
const ErrorValue = "__Error"

type DataType string

const (
	String  DataType = "String"
	Number  DataType = "Number"
	Date    DataType = "Date"
	Boolean DataType = "Boolean"
	Array   DataType = "Array"
	Unknown DataType = "Unknown"
)

type TableSchema map[string]FieldSchema

type FieldSchema struct {
	Name         string        `json:"name"`
	Type         DataType      `json:"type"`
	OriginalType string        `json:"originalType"`
	Nullable     bool          `json:"nullable"`
	Enum         []interface{} `json:"enum"`
	Readonly     bool          `json:"readonly"`
	Primary      bool          `json:"primary"`
	// Format       string        `json:"format"`
}
