package routers

import (
	"downloader/pkg/auth"
	"downloader/pkg/e"
	"downloader/pkg/logging"
	v1 "downloader/routers/v1"

	"github.com/gin-gonic/gin"
)

func InitRouter() *gin.Engine {
	r := gin.New()

	r.SetTrustedProxies(nil)

	r.Use(logging.LoggingMiddleware())
	r.Use(auth.ApiKeyMiddleware())
	r.Use(e.ErrorHandler())
	// r.Use(gin.CustomRecovery(e.RecoveryHandler()))
	r.Use(gin.Recovery())

	apiV1 := r.Group("/api/v1")

	apiV1.GET("/", v1.HelloWorld)
	apiV1.GET("/test", v1.Test)

	apiV1Excel := apiV1.Group("/excel")
	apiV1Excel.POST("/download", v1.DownloadExcel)

	apiV1GoogleSheets := apiV1.Group("/google-sheets")
	apiV1GoogleSheets.POST("/download", v1.DownloadGoogleSheets)

	return r
}
