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
	// both players read the session before signaling, so their first signal skips this lookup
	cacheRoster(session.ID, memberIDs(session.Members))
	c.JSON(http.StatusOK, session)
}

func JoinSession(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := ags.JoinSession(auth.AccessToken, c.Param("id")); err != nil {
		respondError(c, err, "session/:id/join POST")
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

func pvpPeers(accessToken, sessionID, userID string) ([]string, error) {
	members, found := cachedRoster(sessionID)
	if !found {
		session, err := ags.GetSession(accessToken, sessionID)
		if err != nil {
			return nil, err
		}
		members = memberIDs(session.Members)
		cacheRoster(sessionID, members)
	}

	peers := make([]string, 0, len(members))
	isMember := false
	for _, member := range members {
		if member == userID {
			isMember = true
		} else {
			peers = append(peers, member)
		}
	}
	if !isMember {
		return nil, nil
	}
	return peers, nil
}

// SignalSession relays a WebRTC signal to the other player's Lobby socket.
func SignalSession(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	sessionID := c.Param("id")
	var body map[string]any
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	peers, err := pvpPeers(auth.AccessToken, sessionID, auth.UserID)
	if err != nil {
		respondError(c, err, "session/:id/signal POST")
		return
	}
	if peers == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member of this session"})
		return
	}

	body["sessionId"] = sessionID
	body["userId"] = auth.UserID
	if err := ags.NotifyUsers(peers, "pvp:signal", body); err != nil {
		respondError(c, err, "session/:id/signal POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
