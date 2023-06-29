package routers

import (
	"downloader/pkg/logging"
	v1 "downloader/routers/v1"

	"github.com/gin-gonic/gin"
)

func InitRouter() *gin.Engine {
	r := gin.New()

	r.SetTrustedProxies(nil)

	r.Use(logging.LoggingMiddleware())
	r.Use(gin.Recovery())

	apiV1 := r.Group("/api/v1")

	apiV1.GET("/", v1.HelloWorld)

	return r
}
