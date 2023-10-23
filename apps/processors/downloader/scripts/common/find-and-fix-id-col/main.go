package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"

	"github.com/google/uuid"
)

const (
	defaultIdFieldName = "__StarionId"
	defaultRowNumName  = "__StarionRowNum"
)

// func printExecutionTime(startTime time.Time) {
// fmt.Printf("Execution time: %s\n", time.Since(startTime))
// }

func IsValidUUID(u string) bool {
	_, err := uuid.Parse(u)
	return err == nil
}

func GenUUID() string {
	return uuid.New().String()
}

func writeToBothFileConcurrently(writer *bufio.Writer, fwriter *bufio.Writer, content string) {
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		writer.WriteString(content)
		defer wg.Done()
	}()
	go func() {
		fwriter.WriteString(content)
		defer wg.Done()
	}()
	wg.Wait()
}

func main() {
	// startTime := time.Now()
	// defer printExecutionTime(startTime)

	inFile := flag.String("inFile", "", "File")
	outFile := flag.String("outFile", "", "Out file")              // with new ids
	fullOutFile := flag.String("fullOutFile", "", "Full out file") // with old & new ids
	idColName := flag.String("idColName", defaultIdFieldName, "Column name of auto generated id column")
	rowNumColName := flag.String("rowNumColName", defaultRowNumName, "Column name of row number column")

	flag.Parse()

	idSet := make(map[string]bool)

	// Open the file
	iFile, err := os.Open(*inFile)
	if err != nil {
		log.Fatalf("Cannot open file: %+v", err.Error())
	}
	defer iFile.Close()
	// Open the file for writing
	oFile, err := os.Create(*outFile)
	if err != nil {
		log.Fatalf("Cannot open file: %+v", err.Error())
	}
	defer oFile.Close()
	foFile, err := os.Create(*fullOutFile)
	if err != nil {
		log.Fatalf("Cannot open file: %+v", err.Error())
	}
	defer foFile.Close()

	// Create a scanner to read the file line by line
	scanner := bufio.NewScanner(iFile)
	firstLine := true

	// Create buffered writers
	writer := bufio.NewWriter(oFile)
	fwriter := bufio.NewWriter(foFile)

	writeToBothFileConcurrently(writer, fwriter, fmt.Sprintf("%s,%s\n", *idColName, *rowNumColName))

	for scanner.Scan() {
		if firstLine {
			firstLine = false
			continue // Skip the first line
		}
		line := strings.Split(scanner.Text(), ",")
		id := line[0]
		rowNum := line[1]
		if id == "" {
			newId := GenUUID()
			writeToBothFileConcurrently(writer, fwriter, fmt.Sprintf("%s,%s\n", newId, rowNum))
			idSet[newId] = true
		} else if idSet[id] == true {
			newId := GenUUID()
			writeToBothFileConcurrently(writer, fwriter, fmt.Sprintf("%s,%s\n", newId, rowNum))
			idSet[newId] = true
		} else if IsValidUUID(id) == false {
			newId := GenUUID()
			writeToBothFileConcurrently(writer, fwriter, fmt.Sprintf("%s,%s\n", newId, rowNum))
			idSet[newId] = true
		} else {
			fwriter.WriteString(fmt.Sprintf("%s,%s\n", id, rowNum))
			idSet[id] = true
		}
	}

	// Check for any errors during scanning
	if err := scanner.Err(); err != nil {
		log.Fatalf("Error scanning file: %+v", err.Error())
	}

	err = writer.Flush()
	if err != nil {
		log.Fatalf("Error flushing file: %+v", err.Error())
	}
	err = fwriter.Flush()
	if err != nil {
		log.Fatalf("Error flushing file: %+v", err.Error())
	}
}
