package v1

import (
	"metadata/pkg/app"
	"metadata/pkg/e"

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
	appG.Response(200, e.SUCCESS, HelloWorlfResponse{
		Message: "Test!",
	})
}
