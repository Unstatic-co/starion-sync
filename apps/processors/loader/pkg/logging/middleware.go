package logging

import (
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

const timeFormat = "02/Jan/2006:15:04:05 -0700"

func LoggingMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		// Starting time request
		startTime := time.Now()

		// Processing request
		ctx.Next()

		// End Time request
		endTime := time.Now()

		// execution time
		latencyTime := int(math.Ceil(float64(endTime.Sub(startTime).Nanoseconds()) / 1000000.0))

		// Request method
		reqMethod := ctx.Request.Method

		// Request route
		reqUri := ctx.Request.RequestURI

		// status code
		statusCode := ctx.Writer.Status()

		// Request IP
		clientIP := ctx.ClientIP()

		clientUserAgent := ctx.Request.UserAgent()

		dataLength := ctx.Writer.Size()
		if dataLength < 0 {
			dataLength = 0
		}

		logEntry := logrus.WithFields(logrus.Fields{
			"method":   reqMethod,
			"url":      reqUri,
			"status":   statusCode,
			"latency":  latencyTime,
			"clientIp": clientIP,
		})

		if len(ctx.Errors) > 0 {
			logEntry.Error(ctx.Errors.ByType(gin.ErrorTypePrivate).String())
		} else {
			msg := fmt.Sprintf(
				"%s - [%s] \"%s %s\" %d %d \"%s\" (%dms)",
				clientIP,
				time.Now().Format(timeFormat),
				reqMethod,
				reqUri,
				statusCode,
				dataLength,
				clientUserAgent,
				latencyTime,
			)

			if statusCode >= http.StatusInternalServerError {
				logEntry.Error(msg)
			} else if statusCode >= http.StatusBadRequest {
				logEntry.Warn(msg)
			} else {
				logEntry.Info(msg)
			}
		}

		ctx.Next()
	}
}
