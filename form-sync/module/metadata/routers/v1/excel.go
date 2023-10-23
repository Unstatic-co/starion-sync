package v1

import (
	"fmt"
	"metadata/pkg/app"
	"metadata/pkg/e"
	"metadata/service/excel"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

type UpdateExcelRequest struct {
	DriveId     string `form:"driveId"`
	WorkbookId  string `form:"workbookId" valid:"Required"`
	WorksheetId string `form:"worksheetId" valid:"Required"`
	// WorksheetName string `form:"worksheetName" valid:"Required"`
	AccessToken  string `form:"accessToken" valid:"Required"`
	DataSourceId string `form:"dataSourceId" valid:"Required"`
}

type UpdateExcelResponse struct {
	RowCount int `json:"rowCount"`
}

func UpdateExcelMetaData(c *gin.Context) {
	var (
		appG = app.Gin{C: c}
		body UpdateExcelRequest
	)

	httpCode, errCode := app.BindAndValid(c, &body)
	if errCode != e.SUCCESS {
		appG.Response(httpCode, errCode, nil)
		return
	}

	excelService := excel.New(excel.MicrosoftExcelServiceInitParams{
		DriveId:      body.DriveId,
		WorkbookId:   body.WorkbookId,
		WorksheetId:  body.WorksheetId,
		AccessToken:  body.AccessToken,
		DataSourceId: body.DataSourceId,
	})

	requestContext := c.Request.Context()
	err := excelService.UpdateMetadata(requestContext)
	if err != nil {
		log.Error(fmt.Sprintf("Error running update metadata excel for ds %s: ", body.DataSourceId), err)
		appG.Response(e.ERROR, e.UPDATE_ERROR, nil)
		return
	}

	appG.Response(e.SUCCESS, e.SUCCESS, &UpdateExcelResponse{
		RowCount: excelService.RowCount,
	})
}
