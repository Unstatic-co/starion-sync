package main

import (
	"bufio"
	"flag"
	"log"
	"os"

	"github.com/google/uuid"
)

func IsValidUUID(u string) bool {
	_, err := uuid.Parse(u)
	return err == nil
}

func main() {
	filePath := flag.String("file", "", "File")
	// dataSourceId := flag.String("dataSourceId", "", "Data source id")
	// rowCount := flag.Int("rowCount", 0, "Row count")
	flag.Parse()

	// file reader
	file, err := os.Open(*filePath)
	if err != nil {
		log.Fatalf("Cannot open csv file: %+v [%s]", err.Error(), *filePath)
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)

	if err := scanner.Err(); err != nil {
		log.Fatalf("Error reading file: %s", err.Error())
	}

}
