package v1

import (
	"downloader/pkg/app"
	google_sheets "downloader/service/google-sheets"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type IngestGoogleSheetsRequest struct {
	SpreadsheetId string `form:"spreadsheetId" valid:"Required"`
	SheetId       string `form:"sheetId" valid:"Required"`
	SheetName     string `form:"sheetName" valid:"Required"`
	SheetIndex    *int   `form:"sheetIndex" binding:"required,number"`
	TimeZone      string `form:"timeZone" valid:"Required"`
	AccessToken   string `form:"accessToken" valid:"Required"`
	DataSourceId  string `form:"dataSourceId" valid:"Required"`
	SyncVersion   *int   `form:"syncVersion" binding:"required,number"`
}

// type IngestGoogleSheetsResponse struct {
// Message string `json:"message"`
// }

func IngestGoogleSheets(c *gin.Context) {
	var (
		appG = app.Gin{C: c}
		body IngestGoogleSheetsRequest
	)

	err := app.BindAndValid(c, &body)
	if err != nil {
		appG.Error(err)
		return
	}

	service := google_sheets.NewIngestService(google_sheets.GoogleSheetsIngestServiceInitParams{
		SpreadsheetId: body.SpreadsheetId,
		SheetId:       body.SheetId,
		SheetName:     body.SheetName,
		SheetIndex:    *body.SheetIndex,
		TimeZone:      body.TimeZone,
		AccessToken:   body.AccessToken,
		DataSourceId:  body.DataSourceId,
		SyncVersion:   *body.SyncVersion,
	})

	requestContext := c.Request.Context()

	err = service.Setup(requestContext)
	if err != nil {
		err = fmt.Errorf("Error running setup google sheets ingest for ds %s: %w", body.DataSourceId, err)
		appG.Error(err)
		return
	}

	err = service.Run(requestContext)
	if err != nil {
		err = fmt.Errorf("Error running ingest google sheets for ds %s: %w", body.DataSourceId, err)
		appG.Error(err)
		return
	}

	err = service.Close(requestContext)

	appG.Response(http.StatusOK, nil)
}

// #########################################################################################################

type DownloadGoogleSheetsRequest struct {
	SpreadsheetId string `form:"spreadsheetId" valid:"Required"`
	AccessToken   string `form:"accessToken" valid:"Required"`
}
type DownloadGoogleSheetsResponse struct {
	SpreadsheetVersion string `json:"spreadsheetVersion"`
}

func DownloadGoogleSheets(c *gin.Context) {
	var (
		appG = app.Gin{C: c}
		body DownloadGoogleSheetsRequest
	)

	err := app.BindAndValid(c, &body)
	if err != nil {
		appG.Error(err)
		return
	}

	service := google_sheets.NewDownloadService(google_sheets.GoogleSheetsDownloadServiceInitParams{
		SpreadsheetId: body.SpreadsheetId,
		AccessToken:   body.AccessToken,
	})

	requestContext := c.Request.Context()

	err = service.Setup(requestContext)
	if err != nil {
		err = fmt.Errorf("Error running setup google sheets download: %w", err)
		appG.Error(err)
		return
	}

	result, err := service.Run(requestContext)
	if err != nil {
		err = fmt.Errorf("Error running download google sheets for ds %s", err)
		appG.Error(err)
		return
	}

	err = service.Close(requestContext)
	if err != nil {
		err = fmt.Errorf("Error running close google sheets download: %w", err)
		appG.Error(err)
		return
	}

	appG.Response(http.StatusOK, &DownloadGoogleSheetsResponse{
		SpreadsheetVersion: result.SpreadsheetVersion,
	})
}
