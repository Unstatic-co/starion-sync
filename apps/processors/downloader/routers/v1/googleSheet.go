package v1

import (
	"downloader/pkg/app"
	google_sheets "downloader/service/google-sheets"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type DownloadGoogleSheetsRequest struct {
	SpreadsheetId string `form:"spreadsheetId" valid:"Required"`
	SheetId       string `form:"sheetId" valid:"Required"`
	AccessToken   string `form:"accessToken" valid:"Required"`
	DataSourceId  string `form:"dataSourceId" valid:"Required"`
	SyncVersion   *int   `form:"syncVersion" binding:"required,number"`
}
type DownloadGoogleSheetsResponse struct {
	Message string `json:"message"`
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

	service := google_sheets.New(google_sheets.GoogleSheetsServiceInitParams{
		SpreadsheetId: body.SpreadsheetId,
		SheetId:       body.SheetId,
		AccessToken:   body.AccessToken,
		DataSourceId:  body.DataSourceId,
		SyncVersion:   *body.SyncVersion,
	})

	requestContext := c.Request.Context()

	err = service.Setup(requestContext)
	if err != nil {
		err = fmt.Errorf("Error running setup google sheets for ds %s: %w", body.DataSourceId, err)
		appG.Error(err)
		return
	}

	err = service.Download(requestContext)
	if err != nil {
		err = fmt.Errorf("Error running download google sheets for ds %s: %w", body.DataSourceId, err)
		appG.Error(err)
		return
	}

	appG.Response(http.StatusOK, nil)
}
