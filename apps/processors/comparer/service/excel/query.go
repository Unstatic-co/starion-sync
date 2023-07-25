package excel

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
	Int32    ClickHouseType = "Int32"
	Int64    ClickHouseType = "Int64"
	Float32  ClickHouseType = "Float32"
	Float64  ClickHouseType = "Float64"
	String   ClickHouseType = "String"
	Date     ClickHouseType = "Date"
	DateTime ClickHouseType = "DateTime"
	Bool     ClickHouseType = "Bool"
	Array    ClickHouseType = "Array"
)

var ClickHouseTypeMap = map[schema.DataType]ClickHouseType{
	schema.String:   String,
	schema.Number:   Float64,
	schema.DateTime: DateTime,
	schema.Boolean:  Bool,
	schema.Array:    Array,
	schema.Unknown:  String,
}

// ######################################
type QueryContext struct {
	PrimaryColumn  string
	PreviousSchema schema.TableSchema
	CurrentSchema  schema.TableSchema

	CompareSchemaResult CompareSchemaResult

	PreviousDataS3Location  string
	CurrentDataS3Location   string
	ResultS3Location        string
	AddedRowsS3Location     string
	DeletedRowsS3Location   string
	UpdatedFieldsS3Location string
	AddedFieldsS3Location   string
	DeletedFieldsS3Location string

	prevFields  []string
	curFields   []string
	allFields   []string
	keptFields  []string
	addedFields []string
}

func (c *QueryContext) Setup() {
	commonFields := make([]string, 0)
	// get prev fields
	prevFields := make([]string, 0, len(c.PreviousSchema))
	for fieldName := range c.PreviousSchema {
		prevFields = append(prevFields, fieldName)
	}
	// get cur fields
	curFields := make([]string, 0, len(c.CurrentSchema))
	for fieldName := range c.CurrentSchema {
		curFields = append(curFields, fieldName)
	}
	// get all fields of both tables
	fieldMap := make(map[string]bool)
	for key := range c.PreviousSchema {
		fieldMap[key] = true
	}
	for key := range c.CurrentSchema {
		if _, ok := fieldMap[key]; !ok {
			fieldMap[key] = true
		} else {
			commonFields = append(commonFields, key)
		}
	}
	allFields := make([]string, 0, len(fieldMap))
	for key := range fieldMap {
		allFields = append(allFields, key)
	}

	c.prevFields = prevFields
	c.curFields = curFields
	c.allFields = allFields
	c.keptFields = commonFields

	c.addedFields = make([]string, 0)
	for fieldName := range c.CompareSchemaResult.AddedFields {
		c.addedFields = append(c.addedFields, fieldName)
	}
}

func (c *QueryContext) GetFirstVersionCompareQuery() string {
	currentTableName := "c"
	query := fmt.Sprintf(
		`SET s3_truncate_on_insert = 1; %[1]s; %[2]s; %[3]s`,
		c.GenerateCreateTableQuery(currentTableName, c.CurrentSchema),
		c.GenerateInsertDataQuery(currentTableName, c.CurrentDataS3Location),
		c.GenerateFirstVersionAddedRowsTableQuery(currentTableName),
	)
	return query
}

func (c *QueryContext) GetFullCompareQuery() string {
	previousTableName := "p"
	currentTableName := "c"
	diffTableName := "diff"
	query := fmt.Sprintf(
		`SET s3_truncate_on_insert = 1; %[1]s; %[2]s; %[3]s; %[4]s; %[5]s; %[6]s; %[7]s; %[8]s; %[9]s; %[10]s`,
		c.GenerateCreateTableQuery(previousTableName, c.PreviousSchema),
		c.GenerateCreateTableQuery(currentTableName, c.CurrentSchema),
		c.GenerateInsertDataQuery(previousTableName, c.PreviousDataS3Location),
		c.GenerateInsertDataQuery(currentTableName, c.CurrentDataS3Location),
		c.GenerateAddedRowsTableQuery(previousTableName, currentTableName),
		c.GenerateDeletedRowsTableQuery(previousTableName, currentTableName),
		c.GenerateCreateDiffTableQuery(previousTableName, currentTableName, diffTableName),
		c.GenerateUpdatedNullFieldsTableQuery(diffTableName),
		c.GenerateUpdatedFieldsTableQuery(currentTableName, diffTableName),
		c.GenerateAddedFieldsTableQuery(currentTableName, diffTableName),
	)
	return query
}
func (c *QueryContext) GenerateCreateTableQuery(tableName string, tableSchema schema.TableSchema) string {
	tableFields := make([]string, 0, len(tableSchema))
	for fieldName, field := range tableSchema {
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
		c.PrimaryColumn,
	)
	return createTableQuery
}
func (c *QueryContext) GenerateInsertDataQuery(tableName, s3Location string) string {
	query := fmt.Sprintf(
		`
            INSERT INTO %[1]s
            SELECT * FROM s3('%[2]s', '%[3]s', '%[4]s', 'Parquet')
        `,
		tableName,
		s3Location,
		config.AppConfig.S3AccessKey,
		config.AppConfig.S3SecretKey,
	)
	return query
}
func (c *QueryContext) GenerateCreateDiffTableQuery(prevTableName, curTableName, resultTableName string) string {
	selectKeptFields := func(prevTableName, curTableName string, keptFields []string) string {
		selectKeptFields := lo.Map(keptFields, func(field string, _ int) string {
			if field == c.PrimaryColumn {
				return fmt.Sprintf(`%[1]s.|%[2]s| AS |%[2]s|`, curTableName, field)
			}
			return fmt.Sprintf(
				`
					IF (
						%[1]s.|%[3]s| IS NOT NULL AND %[2]s.|%[3]s| IS NULL,
						'updateNull',
						IF (
							cityHash64(assumeNotNull(%[1]s.|%[3]s|))=cityHash64(assumeNotNull(%[2]s.|%[3]s|)),
							'keep',
							'update'
						)
					) AS |%[3]s|
                `,
				prevTableName,
				curTableName,
				field,
			)
		})
		return strings.ReplaceAll(strings.Join(selectKeptFields, ","), "|", "`")
	}(prevTableName, curTableName, c.keptFields)

	selectAddedFields := func(curTableName string, addedFields []string) string {
		selectAddedFields := lo.Map(addedFields, func(field string, _ int) string {
			return fmt.Sprintf(
				`%[1]s.|%[2]s| AS |%[2]s|`,
				curTableName,
				field,
			)
		})
		return strings.ReplaceAll(strings.Join(selectAddedFields, ","), "|", "`")
	}(curTableName, c.addedFields)

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
	}(prevTableName, curTableName, c.prevFields, c.curFields)

	query := fmt.Sprintf(
		`
            CREATE TABLE %[6]s Engine=Memory AS
            WITH
                (select groupArray(name) from system.columns where table = '%[1]s') as %[1]s_cols,
                (select groupArray(name) from system.columns where table = '%[2]s') as %[2]s_cols
            SELECT %[3]s FROM %[1]s JOIN %[2]s ON %[1]s.|%[7]s| = %[2]s.|%[7]s| WHERE %[5]s
        `,
		prevTableName,
		curTableName,
		selectKeptFields,
		selectAddedFields,
		whereConditionsSubQuery,
		resultTableName,
		c.PrimaryColumn,
	)
	return strings.ReplaceAll(query, "|", "`")
}
func (c *QueryContext) GenerateFirstVersionAddedRowsTableQuery(curTableName string) string {
	query := fmt.Sprintf(
		`
            INSERT INTO FUNCTION
                s3(
                    '%[2]s',
                    '%[3]s',
                    '%[4]s',
                    'JSONCompact'
                )
            SELECT * FROM %[1]s
        `,
		curTableName,
		c.AddedRowsS3Location,
		config.AppConfig.S3AccessKey,
		config.AppConfig.S3SecretKey,
		c.PrimaryColumn,
	)
	return strings.ReplaceAll(query, "|", "`")
}
func (c *QueryContext) GenerateAddedRowsTableQuery(prevTableName, curTableName string) string {
	selectFields := strings.Join(lo.Map(c.curFields, func(field string, _ int) string {
		return fmt.Sprintf("%[1]s.`%[2]s` AS %[2]s", curTableName, field)
	}), ",")
	query := fmt.Sprintf(
		`
            INSERT INTO FUNCTION
                s3(
                    '%[3]s',
                    '%[4]s',
                    '%[5]s',
                    'JSONCompact'
                )
            SELECT %[7]s FROM %[1]s RIGHT ANTI JOIN %[2]s ON %[1]s.|%[6]s| = %[2]s.|%[6]s|
        `,
		prevTableName,
		curTableName,
		c.AddedRowsS3Location,
		config.AppConfig.S3AccessKey,
		config.AppConfig.S3SecretKey,
		c.PrimaryColumn,
		selectFields,
	)
	return strings.ReplaceAll(query, "|", "`")
}
func (c *QueryContext) GenerateDeletedRowsTableQuery(prevTableName, curTableName string) string {
	query := fmt.Sprintf(
		`
			INSERT INTO FUNCTION
			s3(
				'%[3]s',
				'%[4]s',
				'%[5]s',
				'JSONCompact'
			)
            SELECT %[6]s AS id FROM %[1]s LEFT ANTI JOIN %[2]s ON %[1]s.|%[6]s| = %[2]s.|%[6]s|
        `,
		prevTableName,
		curTableName,
		c.DeletedRowsS3Location,
		config.AppConfig.S3AccessKey,
		config.AppConfig.S3SecretKey,
		c.PrimaryColumn,
	)
	return strings.ReplaceAll(query, "|", "`")
}
func (c *QueryContext) GenerateUpdatedNullFieldsTableQuery(diffTableName string) string {
	keptFieldsWithoutIdField := lo.Filter(c.keptFields, func(field string, _ int) bool {
		return field != c.PrimaryColumn
	})
	mapBuild := strings.Join(lo.Map(keptFieldsWithoutIdField, func(field string, _ int) string {
		return fmt.Sprintf("'%[1]s',%[1]s", field)
	}), ",")

	query := fmt.Sprintf(
		`
            INSERT INTO FUNCTION
                s3(
                    '%[2]s',
                    '%[3]s',
                    '%[4]s',
                    'JSONCompact'
                )
            SELECT %[5]s AS id,
				mapKeys(mapFilter((k,v) -> (v == 'updateNull'), map(%[6]s))) AS updatedNullFields
			FROM %[1]s
			WHERE length(updatedNullFields) > 0
        `,
		diffTableName,
		c.DeletedFieldsS3Location,
		config.AppConfig.S3AccessKey,
		config.AppConfig.S3SecretKey,
		c.PrimaryColumn,
		mapBuild,
	)
	return strings.ReplaceAll(query, "|", "`")
}
func (c *QueryContext) GenerateUpdatedFieldsTableQuery(curTableName, diffTableName string) string {
	keptFieldsWithoutIdField := lo.Filter(c.keptFields, func(field string, _ int) bool {
		return field != c.PrimaryColumn
	})
	mapBuild := strings.Join(lo.Map(keptFieldsWithoutIdField, func(field string, _ int) string {
		return fmt.Sprintf("IF(%[2]s.`%[3]s` = 'update', %[1]s.`%[3]s`, NULL) AS %[3]s", curTableName, diffTableName, field)
	}), ",")
	selectKeptFields := strings.Join(keptFieldsWithoutIdField, ",")

	query := fmt.Sprintf(
		`
            INSERT INTO FUNCTION
                s3(
                    '%[3]s',
                    '%[4]s',
                    '%[5]s',
                    'JSONCompact'
                )
			SELECT
				%[6]s AS id, replaceAll(replaceRegexpAll(formatRowNoNewline('JSONEachRow',%[8]s), '"\w+?"\s*:\s*null,?', ''), ',}', '}') AS updatedFields
			FROM
				(SELECT %[6]s, %[7]s
				FROM %[2]s JOIN %[1]s ON %[2]s.|%[6]s| = %[1]s.|%[6]s|
				WHERE length(arrayFilter(x -> x = 'update', array(%[2]s.*))) > 0)
        `,
		curTableName,
		diffTableName,
		c.UpdatedFieldsS3Location,
		config.AppConfig.S3AccessKey,
		config.AppConfig.S3SecretKey,
		c.PrimaryColumn,
		mapBuild,
		selectKeptFields,
	)

	return strings.ReplaceAll(query, "|", "`")
}
func (c *QueryContext) GenerateAddedFieldsTableQuery(curTableName, diffTableName string) string {
	if len(c.addedFields) == 0 {
		// upload empty result
		return fmt.Sprintf(
			`
				INSERT INTO FUNCTION
					s3(
						'%[1]s',
						'%[2]s',
						'%[3]s',
						'JSONCompact'
					)
				SELECT 1 LIMIT 0
			`,
			c.AddedFieldsS3Location,
			config.AppConfig.S3AccessKey,
			config.AppConfig.S3SecretKey,
		)
	}

	selectAddedFields := strings.Join(lo.Map(c.addedFields, func(field string, _ int) string {
		return fmt.Sprintf("`%[1]s`", field)
	}), ",")

	query := fmt.Sprintf(
		`
            INSERT INTO FUNCTION
                s3(
                    '%[3]s',
                    '%[4]s',
                    '%[5]s',
                    'JSONCompact'
                )
			SELECT
				%[6]s AS id, formatRowNoNewline('JSONEachRow',%[7]s) AS addedFields
			FROM
				%[1]s JOIN %[2]s ON %[2]s.|%[6]s| = %[1]s.|%[6]s|
        `,
		curTableName,
		diffTableName,
		c.AddedFieldsS3Location,
		config.AppConfig.S3AccessKey,
		config.AppConfig.S3SecretKey,
		c.PrimaryColumn,
		selectAddedFields,
	)

	return strings.ReplaceAll(query, "|", "`")
}
