package excel

import (
	"downloader/pkg/e"
	"fmt"
)

func WrapWorkbookApiError(code int, msg string) *e.ExternalError {
	switch code {
	case 401:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_UNAUTHORIZED, "Workbook unauthorized", msg)
	case 403:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_FORBIDDEN, "Workbook forbidden", msg)
	case 404:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_NOT_FOUND, "Workbook not found", msg)
	default:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_UNKNOWN, fmt.Sprintf("Workbook unknow error (%s)", code), msg)
	}
}

func WrapWorksheetApiError(code int, msg string) *e.ExternalError {
	switch code {
	case 401:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_UNAUTHORIZED, "Workbook unauthorized", msg)
	case 403:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_FORBIDDEN, "Workbook forbidden", msg)
	case 404:
		return e.NewExternalErrorWithDescription(e.WORKSHEET_NOT_FOUND, "Worksheet not found", msg)
	default:
		return e.NewExternalErrorWithDescription(e.WORKSHEET_UNKNOWN, "Worksheet unknown error", msg)
	}
}
