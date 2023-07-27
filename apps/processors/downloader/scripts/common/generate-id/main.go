package main

import (
	"flag"
	"fmt"

	"github.com/google/uuid"
)

const (
	defaultIdFieldName = "__StarionId"
)

func main() {
	col := flag.String("columnName", defaultIdFieldName, "Column name of auto generated id column")
	num := flag.Int("n", 1, "Number of id generated")

	flag.Parse()

	fmt.Println(*col)

	for i := 0; i < *num; i++ {
		id := uuid.New()
		fmt.Println(id.String())
	}
}
