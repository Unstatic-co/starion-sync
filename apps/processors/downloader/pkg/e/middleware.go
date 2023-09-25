package e

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

type ErrorResponse struct {
	Type        ErrorType `json:"type"`
	Code        int       `json:"code"`
	Msg         string    `json:"msg"`
	Description string    `json:"description"`
}

func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		for _, err := range c.Errors {
			rawErr := err.Unwrap()
			log.Error(err)
			var externalErr *ExternalError
			var internalErr *InternalError
			if errors.As(rawErr, &externalErr) {
				log.Debug("External Error")
				c.AbortWithStatusJSON(http.StatusUnprocessableEntity, ErrorResponse{
					Type:        ExternalErrorType,
					Code:        externalErr.Code,
					Msg:         externalErr.Msg,
					Description: externalErr.Description,
				})
				return
			} else if errors.As(rawErr, &internalErr) {
				log.Debug("Internal Error")
				c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{
					Type:        InternalErrorType,
					Code:        internalErr.Code,
					Msg:         internalErr.Msg,
					Description: internalErr.Description,
				})
				return
			} else {
				log.Debug("Unknown Error")
				c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{
					Type:        InternalErrorType,
					Code:        http.StatusInternalServerError,
					Msg:         "Internal Unknown Server Error",
					Description: rawErr.Error(),
				})
				return
			}
		}
		return
	}
}

func RecoveryHandler() gin.RecoveryFunc {
	return func(c *gin.Context, err any) {
		c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{
			Type:        InternalErrorType,
			Code:        http.StatusInternalServerError,
			Msg:         "Internal Unknown Server Error",
			Description: err.(string),
		})
		return
	}
}
