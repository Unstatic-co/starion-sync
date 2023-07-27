package service

import "loader/libs/schema"

type SchemaDiffResult struct {
	DeletedFields     []string                      `json:"deletedFields"`
	AddedFields       map[string]schema.FieldSchema `json:"addedFields"`
	UpdatedFields     map[string]schema.FieldSchema `json:"updatedFields"`
	UpdatedTypeFields map[string]schema.DataType    `json:"updatedTypeFields"`
	KeptFields        map[string]schema.FieldSchema `json:"keptFields"`
}
