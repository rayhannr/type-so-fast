package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

func GetSession(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	session, err := ags.GetSession(auth.AccessToken, c.Param("id"))
	if err != nil {
		respondError(c, err, "session/:id GET")
		return
	}
	c.JSON(http.StatusOK, session)
}

func SetSessionAttributes(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var body struct {
		Attributes map[string]interface{} `json:"attributes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "attributes is required"})
		return
	}

	if err := ags.SetSessionAttributes(auth.AccessToken, c.Param("id"), body.Attributes); err != nil {
		respondError(c, err, "session/:id PATCH")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func LeaveSession(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := ags.LeaveSession(auth.AccessToken, c.Param("id")); err != nil {
		respondError(c, err, "session/:id DELETE")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
