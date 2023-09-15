package main

import (
	"downloader/util"
	"encoding/csv"
	"flag"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"

	"github.com/jszwec/csvutil"
	"github.com/samber/lo"
)

func main() {
	filePath := flag.String("file", "", "File")
	print0 := flag.Bool("print0", false, "Print0")
	sep := flag.String("sep", "", "Separator")
	encode := flag.Bool("encode", false, "Encode to hexa format")
	dedupe := flag.Bool("dedupe", false, "Deduplicate column name")
	quote := flag.Bool("quote", false, "Quote column name in double quote")
	replaceEmpty := flag.String("replaceEmpty", "", "Replace empty column with specified string")

	flag.Parse()

	if *sep != "" && *print0 {
		log.Fatalf("Cannot specify both -print0 and -sep")
	}

	var separator string
	if *print0 {
		separator = "\000"
	} else if *sep != "" {
		separator = *sep
	} else {
		separator = "\n"
	}

	file, err := os.Open(*filePath)
	if err != nil {
		log.Fatalf("Cannot open csv file: %+v [%s]", err.Error(), *filePath)
	}
	reader := csv.NewReader(file)
	dec, err := csvutil.NewDecoder(reader)
	if err != nil {
		log.Fatalf("Cannot decode csv file: %+v", err.Error())
	}

	space := regexp.MustCompile(`\s+`)
	removing := regexp.MustCompile(`["',;]`)
	headers := lo.Map(
		dec.Header(),
		func(field string, _ int) string {
			name := removing.ReplaceAllString(
				space.ReplaceAllString(strings.TrimSpace(field), " "),
				"",
			)
			if name == "" && *replaceEmpty != "" {
				name = *replaceEmpty
			}
			if *encode {
				name = util.HashFieldName(name)
			}
			return name
		},
	)

	if *dedupe {
		existedHeaders := make(map[string]bool)
		newHeaders := make([]string, len(headers))
		for idx, name := range headers {
			if _, exists := existedHeaders[name]; !exists {
				newHeaders[idx] = name
				existedHeaders[name] = true
			} else {
				dedupe_number := 1
				for {
					newName := fmt.Sprintf("%s (%d)", name, dedupe_number)
					if _, exists := existedHeaders[newName]; !exists {
						newHeaders[idx] = newName
						existedHeaders[newName] = true
						break
					}
					dedupe_number += 1
				}
			}
		}
		headers = newHeaders
	}

	if *quote {
		newHeaders := lo.Map(headers, func(inp string, _ int) string { return fmt.Sprintf(`"%s"`, inp) })
		headers = newHeaders
	}

	res := strings.Join(
		headers,
		separator,
	)
	fmt.Print(res)
}
