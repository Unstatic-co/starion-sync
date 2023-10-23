package v1

import (
	"fmt"
	"metadata/pkg/app"
	"metadata/pkg/e"
	google_sheets "metadata/service/google-sheets"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

type UpdateGoogleSheetsRequest struct {
	SpreadsheetId string `form:"spreadsheetId" valid:"Required"`
	SheetId       string `form:"sheetId" valid:"Required"`
	AccessToken   string `form:"accessToken" valid:"Required"`
	DataSourceId  string `form:"dataSourceId" valid:"Required"`
}

type UpdateGoogleSheetsResponse struct {
	RowCount int `json:"rowCount"`
}

func UpdateGoogleSheetsMetaData(c *gin.Context) {
	var (
		appG = app.Gin{C: c}
		body UpdateGoogleSheetsRequest
	)

	httpCode, errCode := app.BindAndValid(c, &body)
	if errCode != e.SUCCESS {
		appG.Response(httpCode, errCode, nil)
		return
	}

	service := google_sheets.New(google_sheets.GoogleSheetsServiceInitParams{
		SpreadSheetId: body.SpreadsheetId,
		SheetId:       body.SheetId,
		AccessToken:   body.AccessToken,
		DataSourceId:  body.DataSourceId,
	})

	requestContext := c.Request.Context()
	err := service.UpdateMetadata(requestContext)
	if err != nil {
		log.Error(fmt.Sprintf("Error running update metadata for ds %s: ", body.DataSourceId), err)
		appG.Response(e.ERROR, e.UPDATE_ERROR, nil)
		return
	}

	appG.Response(e.SUCCESS, e.SUCCESS, &UpdateExcelResponse{
		RowCount: service.RowCount,
	})
}
