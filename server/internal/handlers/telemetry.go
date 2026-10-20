package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

func SendRaceFinished(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var event ags.RaceFinished
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid race event"})
		return
	}
	if err := ags.SendRaceFinished(auth.AccessToken, event); err != nil {
		respondError(c, err, "telemetry race-finished POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
