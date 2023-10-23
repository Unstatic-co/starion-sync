package google_sheets

import (
	"downloader/pkg/e"
	"fmt"

	"google.golang.org/api/googleapi"
)

func WrapSpreadSheetApiError(err *googleapi.Error) error {
	switch err.Code {
	case 401:
		return e.WrapExternalError(err.Unwrap(), e.SPREADSHEET_UNAUTHORIZED, "Spreadsheet unauthorized")
	case 403:
		return e.WrapExternalError(err.Unwrap(), e.SPREADSHEET_FORBIDDEN, "Spreadsheet forbidden")
	case 404:
		return e.WrapExternalError(err.Unwrap(), e.SPREADSHEET_NOT_FOUND, "Spreadsheet not found")
	default:
		return e.WrapExternalError(err.Unwrap(), e.SPREADSHEET_UNKNOWN, fmt.Sprintf("Spreadsheet unknown error, status code = %s", err.Code))
	}
}

func WrapGoogleDriveFileError(err *googleapi.Error) error {
	switch err.Code {
	case 401:
		return e.WrapExternalError(err.Unwrap(), e.GOOGLE_DRIVE_FILE_UNAUTHORIZED, "Google drive file unauthorized")
	case 403:
		return e.WrapExternalError(err.Unwrap(), e.GOOGLE_DRIVE_FILE_FORBIDDEN, "Google drive file forbidden")
	case 404:
		return e.WrapExternalError(err.Unwrap(), e.GOOGLE_DRIVE_FILE_NOT_FOUND, "Google drive file not found")
	default:
		return e.WrapExternalError(err.Unwrap(), e.GOOGLE_DRIVE_FILE_UNKNOWN, fmt.Sprintf("Google drive file unknown error, status code = %s", err.Code))
	}
}
