package auth

import (
	"loader/pkg/config"
	"loader/pkg/e"
	"strings"

	"github.com/gin-gonic/gin"
)

func ApiKeyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-API-Key")

		if apiKey == "" {
			c.Error(&e.InternalError{
				Code: e.API_KEY_MISSING,
				Msg:  "Missing API Key",
			})
			return
		}

		apiKeys := strings.Split(config.AppConfig.ApiKeys, ",")

		if !isValidApiKey(apiKey, apiKeys) {
			c.Error(&e.InternalError{
				Code: e.API_KEY_INVALID,
				Msg:  "Invalid API Key",
			})
			return
		}

		c.Next()
	}
}

func isValidApiKey(apiKey string, apiKeys []string) bool {
	for _, key := range apiKeys {
		if apiKey == key {
			return true
		}
	}
	return false
}
