package v1

import (
	"fmt"
	"loader/pkg/app"
	"loader/pkg/e"
	"loader/service/sheet"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

type LoadRequest struct {
	DataSourceId string `form:"dataSourceId" valid:"Required"`
	SyncVersion  *uint  `form:"syncVersion" binding:"required,number"`
	PrevVersion  *uint  `form:"prevVersion" binding:"required,number"`
	TableName    string `form:"tableName" valid:""`
}
type LoadResponse struct {
	IsSchemaChanged bool   `json:"isSchemaChanged"`
	Message         string `json:"message"`
}

func LoadSheet(c *gin.Context) {
	var (
		appG = app.Gin{C: c}
		body LoadRequest
	)

	httpCode, errCode := app.BindAndValid(c, &body)
	if errCode != e.SUCCESS {
		appG.Response(httpCode, errCode, nil)
		return
	}

	service, err := sheet.NewService(sheet.SheetServiceInitParams{
		DataSourceId: body.DataSourceId,
		SyncVersion:  *body.SyncVersion,
		PrevVersion:  *body.PrevVersion,
		TableName:    body.TableName,
	})
	if err != nil {
		log.Error(fmt.Sprintf("Error when initializing excel service for ds %s: ", body.DataSourceId), err)
		appG.Response(e.ERROR, e.LOADER_ERROR, nil)
		return
	}

	requestContext := c.Request.Context()
	result, err := service.Load(requestContext)
	if err != nil {
		log.Error(fmt.Sprintf("Error running load data for ds %s: ", body.DataSourceId), err)
		appG.Response(e.ERROR, e.LOADER_ERROR, nil)
		return
	}

	appG.Response(e.SUCCESS, e.SUCCESS, &result)
}
