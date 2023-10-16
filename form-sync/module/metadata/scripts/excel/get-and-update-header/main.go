package main

import (
	"encoding/csv"
	"flag"
	"fmt"
	"log"
	"metadata/libs/schema"
	"metadata/util"
	"os"
	"strings"

	"github.com/jszwec/csvutil"
	"github.com/samber/lo"
)

func main() {
	filePath := flag.String("file", "", "File")
	// dataSourceId := flag.String("dataSourceId", "", "Data source id")
	printIdColPosition := flag.Bool("printIdColPosition", true, "Print id column position to stdout")
	printHeaderPositions := flag.Bool("printHeaderPositions", true, "Print headers to stdout")
	flag.Parse()

	file, err := os.Open(*filePath)
	if err != nil {
		log.Fatalf("Cannot open csv file: %+v [%s]", err.Error(), *filePath)
	}
	defer file.Close()
	reader := csv.NewReader(file)
	dec, err := csvutil.NewDecoder(reader)
	if err != nil {
		log.Fatalf("Cannot decode csv file: %+v", err.Error())
	}

	// Get header & encode
	headers := make(map[string]int) // result
	existedHeaders := make(map[string]bool)
	decHeaders := dec.Header()
	for pos, name := range decHeaders {
		if name != "" {
			if _, exists := existedHeaders[name]; !exists {
				headers[name] = pos
				existedHeaders[name] = true
			} else {
				dedupe_number := 1
				for {
					newName := fmt.Sprintf("%s (%d)", name, dedupe_number)
					if _, exists := existedHeaders[newName]; !exists {
						headers[newName] = pos
						existedHeaders[newName] = true
						break
					}
					dedupe_number += 1
				}
			}
		}
	}
	headers = lo.MapKeys(headers, func(_ int, name string) string {
		return util.GetMD5Hash(name)
	})

	// Print header positions
	if *printHeaderPositions {
		fmt.Printf("header_pos %s\n", strings.Join(lo.Values(lo.MapValues(headers, func(
			pos int, _ string) string {
			return fmt.Sprintf("%d", pos+1)
		})), ","))
	}

	// Print id column position
	if *printIdColPosition {
		if _, exists := headers[schema.HashedPrimaryField]; !exists {
			fmt.Printf("id_col_pos -1\n")
		} else {
			fmt.Printf("id_col_pos %d\n", headers[schema.HashedPrimaryField]+1)
		}
	}
}
