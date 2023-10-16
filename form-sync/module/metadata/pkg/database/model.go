package database

type ExcelCommonDocument struct {
	DataSourceId string `bson:"dataSourceId"`
	RowCount     int    `bson:"rowCount"`
	CTag         int    `bson:"cTag"`
}

type ExcelRowPosDocument struct {
	Id           string `bson:"_id"`
	DataSourceId string `bson:"dataSourceId"`
	Pos          int    `bson:"pos"`
}

type GoogleSheetsCommonDocument struct {
	DataSourceId string `bson:"dataSourceId"`
	RowCount     int    `bson:"rowCount"`
}

type GoogleSheetsRowPosDocument struct {
	Id           string `bson:"_id"`
	DataSourceId string `bson:"dataSourceId"`
	Pos          int    `bson:"pos"`
}
