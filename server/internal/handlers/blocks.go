package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

func ListBlockedUsers(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	blockedIDs, err := ags.ListBlockedUsers(auth.AccessToken)
	if err != nil {
		respondError(c, err, "blocks GET")
		return
	}
	blocked, err := ags.GetUserSummaries(blockedIDs)
	if err != nil {
		respondError(c, err, "blocks GET")
		return
	}
	c.JSON(http.StatusOK, blocked)
}

func BlockUser(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var body struct {
		UserID string `json:"userId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	if err := ags.BlockUser(auth.AccessToken, body.UserID); err != nil {
		respondError(c, err, "blocks POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func UnblockUser(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := ags.UnblockUser(auth.AccessToken, c.Param("userId")); err != nil {
		respondError(c, err, "blocks/:userId DELETE")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
