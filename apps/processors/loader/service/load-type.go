package service

import "loader/libs/schema"

type LoaderType string

type AddedRowsData struct {
	Fields []string
	Rows   [][]interface{}
}
type DeletedRowsData []string
type UpdatedFieldsData map[string]map[string]interface{}
type AddedFieldsData map[string]map[string]interface{}
type DeletedFieldsData map[string][]string
type LoaderData struct {
	Schema       schema.TableSchema
	PrimaryField string

	IsSchemaChanged bool
	SchemaChanges   SchemaDiffResult

	AddedRows     AddedRowsData
	DeletedRows   DeletedRowsData
	AddedFields   AddedFieldsData
	UpdatedFields UpdatedFieldsData
	DeletedFields DeletedFieldsData

	Metadata interface{}
}

type LoadedResult struct {
	AddedRowsCount   int  `json:"addedRowsCount"`
	DeletedRowsCount int  `json:"deletedRowsCount"`
	IsSchemaChanged  bool `json:"isSchemaChanged"`
}

type LoaderParams struct {
	DataSourceId string
	SyncVersion  uint
	PrevVersion  uint
	TableName    string
}