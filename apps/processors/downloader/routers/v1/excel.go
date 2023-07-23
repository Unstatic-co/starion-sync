package v1

import (
	"downloader/pkg/app"
	"downloader/pkg/e"
	"downloader/service/excel"
	"fmt"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

type DownloadExcelRequest struct {
	DriveId     string `form:"driveId"`
	WorkbookId  string `form:"workbookId" valid:"Required"`
	WorksheetId string `form:"worksheetId" valid:"Required"`
	// WorksheetName string `form:"worksheetName" valid:"Required"`
	AccessToken  string `form:"accessToken" valid:"Required"`
	SessionId    string `form:"sessionId"`
	DataSourceId string `form:"dataSourceId" valid:"Required"`
	SyncVersion  int    `form:"syncVersion" valid:"Required; Min(0)"`
	Timezone     string `form:"timezone" valid:"Required"`
}
type DownloadExcelResponse struct {
	Message string `json:"message"`
}

func DownloadExcel(c *gin.Context) {
	var (
		appG = app.Gin{C: c}
		body DownloadExcelRequest
	)

	httpCode, errCode := app.BindAndValid(c, &body)
	if errCode != e.SUCCESS {
		appG.Response(httpCode, errCode, nil)
		return
	}

	excelService := excel.New(excel.MicrosoftExcelServiceInitParams{
		DriveId:     body.DriveId,
		WorkbookId:  body.WorkbookId,
		WorksheetId: body.WorksheetId,
		// WorksheetName: body.WorksheetName,
		AccessToken:  body.AccessToken,
		SessionId:    body.SessionId,
		DataSourceId: body.DataSourceId,
		SyncVersion:  body.SyncVersion,
		Timezone:     body.Timezone,
	})

	requestContext := c.Request.Context()
	err := excelService.Download(requestContext)
	if err != nil {
		log.Error(fmt.Sprintf("Error running download excel for ds %s: ", body.DataSourceId), err)
		appG.Response(e.ERROR, e.DOWNLOAD_ERROR, nil)
		return
	}

	appG.Response(e.SUCCESS, e.SUCCESS, &DownloadExcelResponse{
		Message: "Download Success!",
	})
}
