package routers

import (
	"loader/pkg/auth"
	"loader/pkg/e"
	"loader/pkg/logging"
	v1 "loader/routers/v1"

	"github.com/gin-gonic/gin"
)

func InitRouter() *gin.Engine {
	r := gin.New()

	r.SetTrustedProxies(nil)

	r.Use(logging.LoggingMiddleware())
	r.Use(auth.ApiKeyMiddleware())
	r.Use(e.ErrorHandler())
	r.Use(gin.Recovery())

	apiV1 := r.Group("/api/v1")

	apiV1.GET("/", v1.HelloWorld)
	apiV1.GET("/test", v1.Test)

	apiV1.POST("/excel/load", v1.LoadSheet)
	apiV1.POST("/google-sheets/load", v1.LoadSheet)

	return r
}
