package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

// CreateMatchInvite has no server-side invite record: delivery is purely the live notification on
// the invitee's Lobby socket. If the invitee isn't connected when this fires, the invite is
// simply missed — there is no fallback poll.
func CreateMatchInvite(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var body struct {
		InviteeUserID string           `json:"inviteeUserId"`
		Settings      *ags.PvpSettings `json:"settings"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "inviteeUserId is required"})
		return
	}
	if body.Settings != nil && !body.Settings.Valid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "settings needs mode, duration and language"})
		return
	}

	// The settings ride the notification and come back on accept, since there is no invite record
	// to hold them in between.
	payload := map[string]any{"inviterUserId": auth.UserID}
	if body.Settings != nil {
		payload["settings"] = body.Settings
	}
	if err := ags.NotifyUser(body.InviteeUserID, "invite:new", payload); err != nil {
		respondError(c, err, "match-invites POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func AcceptMatchInvite(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var body struct {
		InviterUserID string           `json:"inviterUserId"`
		Settings      *ags.PvpSettings `json:"settings"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "inviterUserId is required"})
		return
	}
	if body.Settings != nil && !body.Settings.Valid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "settings needs mode, duration and language"})
		return
	}

	session, err := ags.CreateInviteSession(auth.AccessToken, body.InviterUserID, auth.UserID, body.Settings)
	if err != nil {
		respondError(c, err, "match-invites/accept POST")
		return
	}
	if err := ags.NotifyUser(body.InviterUserID, "invite:accepted", map[string]any{"sessionId": session.ID}); err != nil {
		respondError(c, err, "match-invites/accept POST")
		return
	}
	c.JSON(http.StatusOK, session)
}

func DeclineMatchInvite(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var body struct {
		InviterUserID string `json:"inviterUserId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "inviterUserId is required"})
		return
	}

	if err := ags.NotifyUser(body.InviterUserID, "invite:declined", map[string]any{"inviteeUserId": auth.UserID}); err != nil {
		respondError(c, err, "match-invites/decline POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
