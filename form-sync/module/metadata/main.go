package main

import (
	"fmt"
	"log"
	"metadata/pkg/config"
	"metadata/pkg/database"
	"metadata/pkg/logging"
	"metadata/routers"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func init() {
	config.Setup()
	logging.Setup()
	database.Setup()
}

func main() {
	if config.AppConfig.IsProduction == true {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	routersInit := routers.InitRouter()
	readTimeout := time.Duration(config.AppConfig.ReadTimeout) * time.Second
	writeTimeout := time.Duration(config.AppConfig.WriteTimeout) * time.Second
	endPoint := fmt.Sprintf(":%d", config.AppConfig.Port)
	maxHeaderBytes := 1 << 20

	server := &http.Server{
		Addr:           endPoint,
		Handler:        routersInit,
		ReadTimeout:    readTimeout,
		WriteTimeout:   writeTimeout,
		MaxHeaderBytes: maxHeaderBytes,
	}

	log.Printf("[info] start http server listening %s", endPoint)

	server.ListenAndServe()
}
