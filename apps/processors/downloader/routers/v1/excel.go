package v1

import (
	"downloader/pkg/app"
	"downloader/service/excel"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type DownloadExcelRequest struct {
	DriveId     string `form:"driveId"`
	WorkbookId  string `form:"workbookId" valid:"Required"`
	WorksheetId string `form:"worksheetId" valid:"Required"`
	// WorksheetName string `form:"worksheetName" valid:"Required"`
	AccessToken  string `form:"accessToken" valid:"Required"`
	SessionId    string `form:"sessionId"`
	DataSourceId string `form:"dataSourceId" valid:"Required"`
	SyncVersion  *int   `form:"syncVersion" binding:"required,number"`
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

	err := app.BindAndValid(c, &body)
	if err != nil {
		appG.Error(err)
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
		SyncVersion:  *body.SyncVersion,
		Timezone:     body.Timezone,
	})

	requestContext := c.Request.Context()
	err = excelService.Download(requestContext)
	if err != nil {
		err = fmt.Errorf("Error running download excel for ds %s: %w", body.DataSourceId, err)
		appG.Error(err)
		return
	}

	excelService.Close(requestContext)

	appG.Response(http.StatusOK, nil)
}
