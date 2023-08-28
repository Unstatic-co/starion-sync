package routers

import (
	"comparer/pkg/logging"
	v1 "comparer/routers/v1"

	"github.com/gin-gonic/gin"
)

func InitRouter() *gin.Engine {
	r := gin.New()

	r.SetTrustedProxies(nil)

	r.Use(logging.LoggingMiddleware())
	r.Use(gin.Recovery())

	apiV1 := r.Group("/api/v1")

	apiV1.GET("/", v1.HelloWorld)
	apiV1.GET("/test", v1.Test)

	apiV1.POST("/excel/compare", v1.Compare)
	apiV1.POST("/google-sheets/compare", v1.Compare)

	return r
}
