package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

func LoginWithDeviceID(c *gin.Context) {
	var body struct {
		DeviceID string `json:"deviceId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.DeviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "deviceId is required"})
		return
	}

	session, err := ags.LoginWithDeviceID(body.DeviceID)
	if err != nil {
		respondError(c, err, "auth POST")
		return
	}
	c.JSON(http.StatusOK, session)
}

func LoginWithGoogle(c *gin.Context) {
	var body struct {
		IDToken string `json:"idToken"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.IDToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "idToken is required"})
		return
	}

	session, err := ags.LoginWithGoogle(body.IDToken)
	if err != nil {
		respondError(c, err, "auth/google POST")
		return
	}
	c.JSON(http.StatusOK, session)
}

func LinkGoogleAccount(c *gin.Context) {
	var body struct {
		UserID      string `json:"userId"`
		AccessToken string `json:"accessToken"`
		IDToken     string `json:"idToken"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.UserID == "" || body.AccessToken == "" || body.IDToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId, accessToken, and idToken are required"})
		return
	}

	if err := ags.LinkGoogleAccount(body.AccessToken, body.IDToken); err != nil {
		respondError(c, err, "auth/link-google POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"linked": true})
}

func UnlinkGoogleAccount(c *gin.Context) {
	var body struct {
		UserID      string `json:"userId"`
		AccessToken string `json:"accessToken"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.UserID == "" || body.AccessToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId and accessToken are required"})
		return
	}

	if err := ags.UnlinkGoogleAccount(body.AccessToken); err != nil {
		respondError(c, err, "auth/unlink-google POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"unlinked": true})
}

func GoogleLinkStatus(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session headers are required"})
		return
	}

	linked, err := ags.GetLinkedGoogleAccount(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "auth/google-status GET")
		return
	}
	c.JSON(http.StatusOK, linked)
}
