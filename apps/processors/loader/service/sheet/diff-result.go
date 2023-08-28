package sheet

type DiffResultMeta struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type DiffResultMeataStatistics struct {
	Elapsed   float64 `json:"elapsed"`
	RowsRead  int     `json:"rows_read"`
	BytesRead int     `json:"bytes_read"`
}

type DiffResult struct {
	Meta       []DiffResultMeta          `json:"meta"`
	Data       [][]interface{}           `json:"data"`
	Rows       int                       `json:"rows"`
	Statistics DiffResultMeataStatistics `json:"statistics"`
}
