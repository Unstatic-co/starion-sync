package postgres

type TableColumn string

const (
	// table
	DataSourceTable  string = "datasource"
	SchemaTable      string = "schema"
	SchemaFieldTable string = "schema_field"

	// common column
	IdColumn        TableColumn = "id"
	CreatedAtColumn TableColumn = "created_at"
	UpdatedAtColumn TableColumn = "updated_at"
	MetadataColumn  TableColumn = "metadata"

	// data table column
	TableDataDataColumn TableColumn = "data"

	// schema table column
	DataSourceIdColumn = "data_source_id"

	// schema field table column
	SchemaIdColumn     = "schema_id"
	HashedNameColumn   = "hashed_name"
	NameColumn         = "name"
	TypeColumn         = "type"
	OriginalTypeColumn = "original_type"
	NullableColumn     = "nullable"
	EnumColumn         = "enum"
	ReadonlyColumn     = "readonly"
	IsPrimaryColumn    = "is_primary"
)
