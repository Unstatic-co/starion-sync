package schema

const HashedPrimaryField = "f_gfbbfabeggejigfgbfhdcdbecifcjhdd" // MD5 hash of OriginalPrimaryFieldName
const OriginalPrimaryFieldName = "__StarionId"
const PrimaryFieldName = "id"

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
