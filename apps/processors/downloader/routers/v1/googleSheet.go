package v1

import (
	"downloader/pkg/app"
	"downloader/pkg/e"
	google_sheets "downloader/service/google-sheets"
	"fmt"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
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

	httpCode, errCode := app.BindAndValid(c, &body)
	if errCode != e.SUCCESS {
		appG.Response(httpCode, errCode, nil)
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
	err := service.Download(requestContext)
	if err != nil {
		log.Error(fmt.Sprintf("Error running download google sheets for ds %s: ", body.DataSourceId), err)
		appG.Response(e.ERROR, e.DOWNLOAD_ERROR, nil)
		return
	}

	appG.Response(e.SUCCESS, e.SUCCESS, &DownloadExcelResponse{
		Message: "Download Success!",
	})
}
