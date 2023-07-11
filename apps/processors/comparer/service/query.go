package service

import (
	"comparer/libs/schema"
	"comparer/pkg/config"
	"fmt"
	"strings"

	"github.com/samber/lo"
)

// Clickhouse type
type ClickHouseType string

const (
	Int32   ClickHouseType = "Int32"
	Int64   ClickHouseType = "Int64"
	Float32 ClickHouseType = "Float32"
	Float64 ClickHouseType = "Float64"
	String  ClickHouseType = "String"
	Date    ClickHouseType = "Date"
	Bool    ClickHouseType = "Bool"
	Array   ClickHouseType = "Array"
)

var ClickHouseTypeMap = map[schema.DataType]ClickHouseType{
	schema.String:   String,
	schema.Number:   Int32,
	schema.DateTime: Date,
	schema.Boolean:  Bool,
	schema.Array:    Array,
	schema.Unknown:  String,
}

// ######################################

type QueryContext struct {
	PrimaryColumn          string
	PreviousSchema         schema.TableSchema
	CurrentSchema          schema.TableSchema
	PreviousDataS3Location string
	CurrentDataS3Location  string
	ResultS3Location       string
	AddedRowsS3Location    string
	DeletedRowsS3Location  string
	UpdatedFieldS3Location string
	DeletedFieldS3Location string
}

func (c *QueryContext) GetFullCompareQuery() string {

	query := fmt.Sprintf(
		`%[1]s; %[2]s; %[3]s; %[4]s; %[5]s; %[6]s`,
		GenerateCreateTableQuery(c.PreviousSchema, "p", c.PrimaryColumn),
		GenerateCreateTableQuery(c.CurrentSchema, "c", c.PrimaryColumn),
		GenerateInsertDataQuery("p", c.PreviousDataS3Location),
		GenerateInsertDataQuery("c", c.CurrentDataS3Location),
		GenerateCreateDiffTableQuery("p", "c", "diff", c.PreviousSchema, c.CurrentSchema),
		c.GenerateAddedRowsTableQuery("p", "c", c.CurrentSchema),
		c.GenerateRemovedRowsTableQuery("p", "c"),
		c.GetExportResultQuery("diff"),
	)

	return query
}

func (c *QueryContext) GetExportResultQuery(tableName string) string {

	query := fmt.Sprintf(
		`
			SET s3_truncate_on_insert = 1;
			INSERT INTO FUNCTION
				s3(
					'%[1]s',
					'%[2]s',
					'%[3]s',
					'JSONEachRow'
				)
			SELECT * FROM %[4]s
		`,
		c.ResultS3Location,
		config.AppConfig.S3AccessKey,
		config.AppConfig.S3SecretKey,
		tableName,
	)

	return query
}

func GenerateCreateTableQuery(schema schema.TableSchema, tableName, primaryColumn string) string {
	tableFields := make([]string, 0, len(schema))
	for fieldName, field := range schema {
		var fieldString string
		if !field.Primary {
			fieldString = fmt.Sprintf(`%s Nullable(%s)`, fieldName, ClickHouseTypeMap[field.Type])
		} else {
			fieldString = fmt.Sprintf(`%s %s`, fieldName, ClickHouseTypeMap[field.Type])
		}
		tableFields = append(tableFields, fieldString)
	}
	tableFieldsString := strings.Join(tableFields, ",")
	createTableQuery := fmt.Sprintf(
		`
			CREATE TABLE %[1]s
			(
				%[2]s
			)
			ENGINE = MergeTree()
			PRIMARY KEY (%[3]s)
		`,
		tableName,
		tableFieldsString,
		primaryColumn,
	)
	return createTableQuery
}

func GenerateInsertDataQuery(tableName, s3FilePath string) string {
	query := fmt.Sprintf(
		`
			INSERT INTO %[1]s
			SELECT * FROM s3('%[2]s', '%[3]s', '%[4]s', 'Parquet')
		`,
		tableName,
		s3FilePath,
		config.AppConfig.S3AccessKey,
		config.AppConfig.S3SecretKey,
	)
	return query
}

func GenerateCreateDiffTableQuery(prevTableName, curTableName, resultTableName string, prevSchema, curSchema schema.TableSchema) string {
	// get prev fields
	prevFields := make([]string, 0, len(prevSchema))
	for fieldName := range prevSchema {
		prevFields = append(prevFields, fieldName)
	}

	// get cur fields
	curFields := make([]string, 0, len(curSchema))
	for fieldName := range curSchema {
		curFields = append(curFields, fieldName)
	}

	// get all fields of both tables
	fieldMap := make(map[string]bool)
	for key := range prevSchema {
		fieldMap[key] = true
	}
	for key := range curSchema {
		if _, ok := fieldMap[key]; !ok {
			fieldMap[key] = true
		}
	}
	allFields := make([]string, 0, len(fieldMap))
	for key := range fieldMap {
		allFields = append(allFields, key)
	}

	diffFieldsSubQuery := func(prevTableName, curTableName string, allFields []string) string {
		diffFieldsPartialQuery := lo.Map(allFields, func(field string, _ int) string {
			if field == schema.HashedPrimaryField {
				return fmt.Sprintf(`%[1]s.|%[2]s| AS %[2]s`, curTableName, field)
			}
			return fmt.Sprintf(
				`
					IF(
						has(%[2]s_cols, '%[3]s') AND %[2]s.|%[3]s| IS NOT NULL,
						IF(
							has(%[1]s_cols, '%[3]s'),
							IF(
								%[1]s.|%[3]s| IS NULL,
								'update',
								IF(cityHash64(%[1]s.|%[3]s|)=cityHash64(%[2]s.|%[3]s|), 'keep', 'update')
							),
							'delete'
						),
						IF(
							NOT has(%[2]s_cols, '%[3]s'),
							'delete',
							IF (%[1]s.|%[3]s| IS NOT NULL, 'update', 'keep')
						)
					) AS |%[3]s|
				`,
				prevTableName,
				curTableName,
				field,
				schema.HashedPrimaryField,
			)
		})
		return strings.ReplaceAll(strings.Join(diffFieldsPartialQuery, ","), "|", "`")
	}(prevTableName, curTableName, allFields)

	whereConditionsSubQuery := func(prevTableName, curTableName string, prevFields, curFields []string) string {
		prevHashFields := lo.Map(prevFields, func(field string, _ int) string {
			return fmt.Sprintf("assumeNotNull(%[1]s.|%[2]s|)", prevTableName, field)
		})
		prevHashFieldsString := fmt.Sprintf("cityHash64(%[1]s)", strings.Join(prevHashFields, ","))
		curHashFields := lo.Map(curFields, func(field string, _ int) string {
			return fmt.Sprintf("assumeNotNull(%[1]s.|%[2]s|)", curTableName, field)
		})
		curHashFieldsString := fmt.Sprintf("cityHash64(%[1]s)", strings.Join(curHashFields, ","))
		return strings.ReplaceAll(fmt.Sprintf("%[1]s != %[2]s", prevHashFieldsString, curHashFieldsString), "|", "`")
	}(prevTableName, curTableName, prevFields, curFields)

	selectDiffFields := func(prevTableName, curTableName string, allFields []string) string {
		selectDiffFields := lo.Map(allFields, func(field string, _ int) string {
			if field == schema.HashedPrimaryField {
				return fmt.Sprintf(`%[1]s.|%[2]s| AS %[2]s`, curTableName, field)
			}
			return fmt.Sprintf(
				`
					IF (diff.|%[2]s| = 'update' OR diff.|%[2]s| = 'add', %[1]s.|%[2]s|, diff.|%[2]s|) AS |%[2]s|
				`,
				curTableName,
				field,
				schema.HashedPrimaryField,
			)
		})
		return strings.ReplaceAll(strings.Join(selectDiffFields, ","), "|", "`")
	}(prevTableName, curTableName, allFields)

	query := fmt.Sprintf(
		// `
		// CREATE TABLE %[6]s Engine=Memory AS
		// WITH
		// (select groupArray(name) from system.columns where table = '%[1]s') as %[1]s_cols,
		// (select groupArray(name) from system.columns where table = '%[2]s') as %[2]s_cols
		// SELECT %[5]s FROM (
		// SELECT %[3]s FROM %[1]s JOIN %[2]s ON %[1]s.|%[7]s| = %[2]s.|%[7]s| WHERE %[4]s
		// ) as diff
		// JOIN %[2]s ON diff.|%[7]s| = %[2]s.|%[7]s|
		// `,
		`
			CREATE TABLE %[6]s Engine=Memory AS
			WITH
				(select groupArray(name) from system.columns where table = '%[1]s') as %[1]s_cols,
				(select groupArray(name) from system.columns where table = '%[2]s') as %[2]s_cols
			SELECT %[3]s FROM %[1]s JOIN %[2]s ON %[1]s.|%[7]s| = %[2]s.|%[7]s| WHERE %[4]s
		`,
		prevTableName,
		curTableName,
		diffFieldsSubQuery,
		whereConditionsSubQuery,
		selectDiffFields,
		resultTableName,
		schema.HashedPrimaryField,
	)

	return strings.ReplaceAll(query, "|", "`")
}

func (c *QueryContext) GenerateAddedRowsTableQuery(prevTableName, curTableName string, curSchema schema.TableSchema) string {
	// get fields
	curFields := make([]string, 0, len(curSchema))
	for fieldName := range curSchema {
		curFields = append(curFields, fieldName)
	}
	selectFields := lo.Map(curFields, func(field string, _ int) string {
		return fmt.Sprintf("%[1]s.`%[2]s` AS %[2]s", curTableName, field)
	})
	selectFieldsString := strings.Join(selectFields, ",")

	query := fmt.Sprintf(
		`
			INSERT INTO FUNCTION
				s3(
					'%[3]s',
					'%[4]s',
					'%[5]s',
					'JSONEachRow'
				)
			SELECT %[7]s FROM %[1]s JOIN %[2]s ON %[1]s.|%[6]s| = %[2]s.|%[6]s| WHERE %[1]s.|%[6]s| IS NULL
		`,
		prevTableName,
		curTableName,
		c.AddedRowsS3Location,
		config.AppConfig.S3AccessKey,
		config.AppConfig.S3SecretKey,
		schema.HashedPrimaryField,
		selectFieldsString,
	)

	return strings.ReplaceAll(query, "|", "`")
}

func (c *QueryContext) GenerateRemovedRowsTableQuery(prevTableName, curTableName string) string {
	query := fmt.Sprintf(
		`
			INSERT INTO FUNCTION
				s3(
					'%[3]s',
					'%[4]s',
					'%[5]s',
					'JSONEachRow'
				)
			SELECT groupArray(%[6]s) as deletedRows FROM %[1]s JOIN %[2]s ON %[1]s.|%[6]s| = %[2]s.|%[6]s| WHERE %[2]s.|%[6]s| IS NULL
		`,
		prevTableName,
		curTableName,
		c.DeletedRowsS3Location,
		config.AppConfig.S3AccessKey,
		config.AppConfig.S3SecretKey,
		schema.HashedPrimaryField,
	)

	return strings.ReplaceAll(query, "|", "`")
}
