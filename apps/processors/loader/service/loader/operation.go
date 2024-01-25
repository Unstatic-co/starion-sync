package loader

type Operation struct {
	Id int64 `pg:"id,pk"`
    Name  string `pg:"name,notnull"`
    Status string `pg:"status"`
}
