package excel

import (
	"downloader/pkg/e"
	"fmt"
)

func WrapWorkbookApiError(code int, msg string) error {
	switch code {
	case 401:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_UNAUTHORIZED, "Workbook unauthorized", msg)
	case 403:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_FORBIDDEN, "Workbook forbidden", msg)
	case 404:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_NOT_FOUND, "Workbook not found", msg)
	default:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_SESSION_UNKNOWN, fmt.Sprintf("Create workbook session unknown error, status code = %s", code), msg)
	}
}

func WrapWorksheetApiError(code int, msg string) error {
	switch code {
	case 401:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_UNAUTHORIZED, "Workbook unauthorized", msg)
	case 403:
		return e.NewExternalErrorWithDescription(e.WORKBOOK_FORBIDDEN, "Workbook forbidden", msg)
	case 404:
		return e.NewExternalErrorWithDescription(e.WORKSHEET_NOT_FOUND, "Worksheet not found", msg)
	default:
		return e.NewExternalErrorWithDescription(e.GET_WORKSHEET_INFO, "Get worksheet info unknown error", msg)
	}
}
