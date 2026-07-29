package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
	"type-so-fast-server/internal/pusherx"
)

func roomChannel(sessionID string) string { return "private-room-" + sessionID }

func CreateRoom(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	room, err := ags.CreateRoomSession(auth.AccessToken)
	if err != nil {
		respondError(c, err, "rooms POST")
		return
	}
	code, err := ags.GenerateRoomCode(auth.AccessToken, room.ID)
	if err != nil {
		respondError(c, err, "rooms POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": room.ID, "leaderId": room.LeaderID, "members": room.Members, "code": code, "attributes": room.Attributes})
}

func JoinRoom(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var body struct {
		Code string `json:"code"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}

	room, err := ags.JoinRoomByCode(auth.AccessToken, body.Code)
	if err != nil {
		respondError(c, err, "rooms/join POST")
		return
	}
	if err := pusherx.Trigger(roomChannel(room.ID), "room:joined", gin.H{"userId": auth.UserID}); err != nil {
		respondError(c, err, "rooms/join POST")
		return
	}
	c.JSON(http.StatusOK, room)
}

func GetRoom(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	sessionID := c.Param("sessionId")
	room, err := ags.GetRoomSession(auth.AccessToken, sessionID)
	if err != nil {
		respondError(c, err, "rooms/:sessionId GET")
		return
	}
	memberIDs := make([]string, len(room.Members))
	for i, m := range room.Members {
		memberIDs[i] = m.UserID
	}
	memberNames, err := ags.GetUserSummaries(memberIDs)
	if err != nil {
		respondError(c, err, "rooms/:sessionId GET")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":          room.ID,
		"leaderId":    room.LeaderID,
		"members":     room.Members,
		"code":        room.Code,
		"attributes":  room.Attributes,
		"memberNames": memberNames,
	})
}

// StartRoom has no host check: AGS itself rejects a non-leader LockRoom call with 403
// LeadershipRequired, so respondError surfaces that as-is. Locking is best-effort — a room left
// joinable mid-race beats a match that never starts, since every client (host included) starts on
// the room:start broadcast.
func StartRoom(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	sessionID := c.Param("sessionId")
	var body struct {
		Words    []string `json:"words"`
		Duration int      `json:"duration"`
		Mode     string   `json:"mode"`
		Language string   `json:"language"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	if err := ags.LockRoom(auth.AccessToken, sessionID); err != nil {
		log.Printf("[rooms/%s/start] lockRoom failed — starting unlocked: %v", sessionID, err)
	}

	// single shared origin for every client's wpm wall-clock math (see RoomSessionAttributes.startedAt)
	startedAt := time.Now().UnixMilli()
	payload := gin.H{"words": body.Words, "duration": body.Duration, "mode": body.Mode, "language": body.Language, "startedAt": startedAt}
	if err := pusherx.Trigger(roomChannel(sessionID), "room:start", payload); err != nil {
		respondError(c, err, "rooms/:sessionId/start POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "startedAt": startedAt})
}

// ProgressRoom takes userId from auth, not the request body, so a player can't spoof another
// player's progress. sentAt (the sender's clock at publish time) rides along so receivers can drop
// an update that arrives out of order — separate POSTs racing to Pusher have no delivery-order
// guarantee.
func ProgressRoom(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	sessionID := c.Param("sessionId")
	var body struct {
		WPM      float64 `json:"wpm"`
		Progress float64 `json:"progress"`
		SentAt   int64   `json:"sentAt"`
		Final    bool    `json:"final"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	payload := gin.H{"userId": auth.UserID, "wpm": body.WPM, "progress": body.Progress, "sentAt": body.SentAt, "final": body.Final}
	if err := pusherx.Trigger(roomChannel(sessionID), "room:progress", payload); err != nil {
		respondError(c, err, "rooms/:sessionId/progress POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
