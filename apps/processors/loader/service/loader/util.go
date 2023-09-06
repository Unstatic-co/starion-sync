package loader

import "loader/service"

func IsSchemaChanged(schemaDiffResult service.SchemaDiffResult) bool {
	return len(schemaDiffResult.DeletedFields) > 0 ||
		len(schemaDiffResult.AddedFields) > 0 ||
		len(schemaDiffResult.UpdatedFields) > 0 ||
		len(schemaDiffResult.UpdatedTypeFields) > 0
}
