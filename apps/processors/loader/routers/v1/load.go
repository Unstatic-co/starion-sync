package v1

import (
	"fmt"
	"loader/pkg/app"
	"loader/service/sheet"
	"net/http"

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

	err := app.BindAndValid(c, &body)
	if err != nil {
		appG.Error(err)
		return
	}

	service, err := sheet.NewService(sheet.SheetServiceInitParams{
		DataSourceId: body.DataSourceId,
		SyncVersion:  *body.SyncVersion,
		PrevVersion:  *body.PrevVersion,
		TableName:    body.TableName,
	})
	if err != nil {
		appG.Error(fmt.Errorf("Error when initializing excel service for ds %s: %w", body.DataSourceId, err))
		return
	}

	requestContext := c.Request.Context()
	result, err := service.Load(requestContext)
	if err != nil {
		log.Error(fmt.Sprintf("Error running load data for ds %s: ", body.DataSourceId), err)
		appG.Error(fmt.Errorf("Error running load data for ds %s: %w", body.DataSourceId, err))
		return
	}

	appG.Response(http.StatusOK, &result)
}
