package v1

import (
	"downloader/pkg/app"
	"downloader/pkg/e"
	"downloader/service/excel"

	"github.com/gin-gonic/gin"
)

type HelloWorlfResponse struct {
	Message string `json:"message"`
}

func HelloWorld(c *gin.Context) {
	appG := app.Gin{C: c}
	appG.Response(200, e.SUCCESS, HelloWorlfResponse{
		Message: "Hello World!",
	})
}

func Test(c *gin.Context) {
	appG := app.Gin{C: c}
	requestContext := c.Request.Context()
	var params excel.MicrosoftExcelServiceInitParams
	service := excel.New(params)
	if err := service.Download(requestContext); err != nil {
		appG.Response(200, e.ERROR, HelloWorlfResponse{
			Message: err.Error(),
		})
		return
	}
	appG.Response(200, e.SUCCESS, HelloWorlfResponse{
		Message: "Test!",
	})
}
