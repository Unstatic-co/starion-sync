package v1

import (
	"comparer/pkg/app"
	"comparer/pkg/e"
	excelService "comparer/service/excel"
	"fmt"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

type CompareRequest struct {
	DataSourceId string `form:"dataSourceId" valid:"Required"`
	SyncVersion  *uint  `form:"syncVersion" binding:"required,number"`
	PrevVersion  *uint  `form:"prevVersion" binding:"required,number"`
}
type CompareResponse struct {
	Message string `json:"message"`
}

func ExcelCompare(c *gin.Context) {
	var (
		appG = app.Gin{C: c}
		body CompareRequest
	)

	httpCode, errCode := app.BindAndValid(c, &body)
	if errCode != e.SUCCESS {
		appG.Response(httpCode, errCode, nil)
		return
	}

	compareService := excelService.New(excelService.CompareServiceInitParams{
		DataSourceId: body.DataSourceId,
		SyncVersion:  *body.SyncVersion,
		PrevVersion:  *body.PrevVersion,
	})

	requestContext := c.Request.Context()
	err := compareService.Run(requestContext)
	if err != nil {
		log.Error(fmt.Sprintf("Error running compare for ds %s: ", body.DataSourceId), err)
		appG.Response(e.ERROR, e.COMPARE_ERROR, nil)
		return
	}

	appG.Response(e.SUCCESS, e.SUCCESS, &CompareResponse{
		Message: "Compare Success!",
	})
}
