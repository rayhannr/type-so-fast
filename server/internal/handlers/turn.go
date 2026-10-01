package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

func TurnServers(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	servers, err := ags.TurnServers(auth.AccessToken)
	if err != nil {
		respondError(c, err, "turn GET")
		return
	}
	c.JSON(http.StatusOK, servers)
}
