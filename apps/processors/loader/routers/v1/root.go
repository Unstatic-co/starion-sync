package v1

import (
	"loader/pkg/app"
	"net/http"

	"github.com/gin-gonic/gin"
)

type HelloWorlfResponse struct {
	Message string `json:"message"`
}

func HelloWorld(c *gin.Context) {
	appG := app.Gin{C: c}
	appG.Response(http.StatusOK, nil)
}

func Test(c *gin.Context) {
	appG := app.Gin{C: c}
	appG.Response(http.StatusOK, "Test")
}
