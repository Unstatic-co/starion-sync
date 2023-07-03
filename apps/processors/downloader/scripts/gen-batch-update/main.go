package main

import (
	"strconv"
)

func ConvertToA1Notation(row, column int) string {
	columnStr := ""

	unit := (column - 1) % 26
	columnStr = string('A'+unit) + columnStr

	for column > 26 {
		column = (column - 1) / 26
		unit = (column - 1) % 26
		columnStr = string('A'+unit) + columnStr
	}

	rowStr := strconv.Itoa(row)

	return columnStr + rowStr
}

func main() {

}
