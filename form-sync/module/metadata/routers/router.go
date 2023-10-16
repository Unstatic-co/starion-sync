package routers

import (
	"metadata/pkg/logging"
	v1 "metadata/routers/v1"

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

	apiV1Excel := apiV1.Group("/excel")
	apiV1Excel.POST("/update", v1.UpdateExcelMetaData)

	apiV1.POST("/google-sheets/update", v1.UpdateGoogleSheetsMetaData)

	return r
}
