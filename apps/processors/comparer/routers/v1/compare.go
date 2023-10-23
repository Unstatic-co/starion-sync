package v1

import (
	"comparer/pkg/app"
	compareService "comparer/service"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type CompareRequest struct {
	DataSourceId string `form:"dataSourceId" valid:"Required"`
	SyncVersion  *uint  `form:"syncVersion" binding:"required,number"`
	PrevVersion  *uint  `form:"prevVersion" binding:"required,number"`
}
type CompareResponse struct {
	Message string `json:"message"`
}

func Compare(c *gin.Context) {
	var (
		appG = app.Gin{C: c}
		body CompareRequest
	)

	err := app.BindAndValid(c, &body)
	if err != nil {
		appG.Error(err)
		return
	}

	compareService := compareService.New(compareService.CompareServiceInitParams{
		DataSourceId: body.DataSourceId,
		SyncVersion:  *body.SyncVersion,
		PrevVersion:  *body.PrevVersion,
	})

	requestContext := c.Request.Context()
	err = compareService.Run(requestContext)
	if err != nil {
		appG.Error(fmt.Errorf("Error running compare for ds %s: %w", body.DataSourceId, err))
		return
	}

	appG.Response(http.StatusOK, nil)
}
