package loader

import "loader/service"

func IsSchemaChanged(schemaDiffResult service.SchemaDiffResult) bool {
	return len(schemaDiffResult.DeletedFields) > 0 ||
		len(schemaDiffResult.AddedFields) > 0 ||
		len(schemaDiffResult.UpdatedFields) > 0 ||
		len(schemaDiffResult.UpdatedTypeFields) > 0
}

func IsDataChanged(data *service.LoaderData) bool {
	return len(data.AddedRows.Rows) > 0 ||
		len(data.DeletedRows) > 0 ||
		len(data.AddedFields) > 0 ||
		len(data.UpdatedFields) > 0 ||
		len(data.DeletedFields) > 0
}

func CaculateLoadedResult(loadData *service.LoaderData) *service.LoadedResult {
	return &service.LoadedResult{
		AddedRowsCount:   len(loadData.AddedRows.Rows),
		DeletedRowsCount: len(loadData.DeletedRows),
		IsSchemaChanged:  IsSchemaChanged(loadData.SchemaChanges),
	}
}