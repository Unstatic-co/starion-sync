package main

import (
	"flag"
	"fmt"

	gonanoid "github.com/matoous/go-nanoid/v2"
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
		id, _ := gonanoid.New()
		fmt.Println(id)
	}
}
