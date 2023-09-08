package auth

import (
	"downloader/pkg/config"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func ApiKeyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-API-Key")

		if apiKey == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "API Key is missing"})
			c.Abort()
			return
		}

		apiKeys := strings.Split(config.AppConfig.ApiKeys, ",")

		if !isValidApiKey(apiKey, apiKeys) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid API Key"})
			c.Abort()
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
