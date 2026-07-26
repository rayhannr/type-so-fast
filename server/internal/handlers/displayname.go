package handlers

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

func GetDisplayName(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	localNameHint := c.Query("localName")
	displayName, err := ags.GetOrCreateDisplayName(auth.AccessToken, localNameHint)
	if err != nil {
		log.Printf("[display-name] GET failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"displayName": displayName})
}

func PatchDisplayName(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var body struct {
		DisplayName string `json:"displayName"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.DisplayName) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "displayName is required"})
		return
	}

	updated, err := ags.UpdateDisplayName(auth.AccessToken, strings.TrimSpace(body.DisplayName))
	if err != nil {
		log.Printf("[display-name] PATCH failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"displayName": updated})
}
