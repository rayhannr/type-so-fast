package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/apiauth"
	"type-so-fast-server/internal/pusherx"
)

const presenceChannel = "presence-online-users"

// PusherAuth mirrors app/api/pusher/auth/route.ts. private-user-{userId} may only ever be
// authorized for the matching userId — this is what keeps one player from subscribing to
// another's invite notifications. Room membership is enforced by AGS at join time (join-by-code),
// not here — private-room-* channels only ever carry progress numbers, so any authenticated user
// can subscribe.
func PusherAuth(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	socketID := c.PostForm("socket_id")
	channelName := c.PostForm("channel_name")
	if socketID == "" || channelName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if strings.HasPrefix(channelName, "private-user-") {
		ownerID := strings.TrimPrefix(channelName, "private-user-")
		if ownerID != auth.UserID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		response, err := pusherx.AuthorizePrivate(socketID, channelName)
		if err != nil {
			respondError(c, err, "pusher/auth POST")
			return
		}
		c.Data(http.StatusOK, "application/json", response)
		return
	}

	if channelName == presenceChannel {
		response, err := pusherx.AuthorizePresence(socketID, channelName, auth.UserID)
		if err != nil {
			respondError(c, err, "pusher/auth POST")
			return
		}
		c.Data(http.StatusOK, "application/json", response)
		return
	}

	if strings.HasPrefix(channelName, "private-room-") {
		response, err := pusherx.AuthorizePrivate(socketID, channelName)
		if err != nil {
			respondError(c, err, "pusher/auth POST")
			return
		}
		c.Data(http.StatusOK, "application/json", response)
		return
	}

	c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
}
