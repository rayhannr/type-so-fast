package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

func GetPersonalStats(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	stats, err := ags.GetPersonalStats(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "stats GET")
		return
	}
	c.JSON(http.StatusOK, stats)
}

func SubmitGameStats(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var result ags.GameResultStats
	if err := c.ShouldBindJSON(&result); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid game result"})
		return
	}
	if err := ags.SubmitGameStats(auth.UserID, auth.AccessToken, result); err != nil {
		respondError(c, err, "stats POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
