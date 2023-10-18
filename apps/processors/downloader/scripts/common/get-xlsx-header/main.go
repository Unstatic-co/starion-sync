package main

import (
	"flag"
	"fmt"
	"strings"

	"github.com/thedatashed/xlsxreader"
)

// func printExecutionTime(startTime time.Time) {
// fmt.Printf("Execution time: %s\n", time.Since(startTime))
// }

func main() {
	// startTime := time.Now()
	// defer printExecutionTime(startTime)

	file := flag.String("file", "", "Xlsx file")
	showMaxIndex := flag.Bool("showMaxIndex", false, "Output max index of headers")
	showHeaders := flag.Bool("showHeaders", true, "Output headers")
	// emptySignal := flag.String("emptySignal", "__StarionEmpty", "Output value if sheet is empty")

	flag.Parse()

	xl, _ := xlsxreader.OpenFile(*file)

	readChan := xl.ReadRows(xl.Sheets[0])

	firstRow := <-readChan
	xl.Close()

	if firstRow.Index != 1 {
		// fmt.Print(*emptySignal)
	} else {
		maxColumnIndex := firstRow.Cells[len(firstRow.Cells)-1].ColumnIndex()
		if *showMaxIndex {
			fmt.Print(maxColumnIndex)
		} else if *showHeaders {
			headers := make([]string, maxColumnIndex+1)
			for i, _ := range headers {
				headers[i] = ""
			}
			for _, cell := range firstRow.Cells {
				// fmt.Printf("index %d\n", cell.ColumnIndex())
				// headers = append(headers, fmt.Sprintf("%s", cell.Value))
				header := fmt.Sprintf("%s", cell.Value)
				if strings.Contains(header, ",") {
					header = fmt.Sprintf("\"%s\"", header)
				}
				headers[cell.ColumnIndex()] = header
			}
			fmt.Print(strings.Join(headers, ","))
		}
	}
}
