package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
	"type-so-fast-server/internal/pusherx"
)

func ListFriends(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	friendIDs, err := ags.ListFriends(auth.AccessToken)
	if err != nil {
		respondError(c, err, "friends GET")
		return
	}
	friends, err := ags.GetUserSummaries(friendIDs)
	if err != nil {
		respondError(c, err, "friends GET")
		return
	}
	c.JSON(http.StatusOK, friends)
}

func SendFriendRequest(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var body struct {
		PublicID string `json:"publicId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "publicId is required"})
		return
	}

	if err := ags.SendFriendRequest(auth.AccessToken, body.PublicID); err != nil {
		respondError(c, err, "friends POST")
		return
	}

	friendUserID, err := ags.GetUserIDByPublicID(auth.AccessToken, body.PublicID)
	if err != nil {
		respondError(c, err, "friends POST")
		return
	}
	if friendUserID != "" {
		if err := pusherx.Trigger(userChannel(friendUserID), "friend:request", gin.H{}); err != nil {
			respondError(c, err, "friends POST")
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func ListIncomingFriendRequests(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	requesterIDs, err := ags.ListIncomingFriendRequests(auth.AccessToken)
	if err != nil {
		respondError(c, err, "friends/incoming GET")
		return
	}
	incoming, err := ags.GetUserSummaries(requesterIDs)
	if err != nil {
		respondError(c, err, "friends/incoming GET")
		return
	}
	c.JSON(http.StatusOK, incoming)
}

func RemoveFriend(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := ags.RemoveFriend(auth.AccessToken, c.Param("userId")); err != nil {
		respondError(c, err, "friends/:userId DELETE")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func AcceptFriendRequest(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := ags.AcceptFriendRequest(auth.AccessToken, c.Param("userId")); err != nil {
		respondError(c, err, "friends/:userId/accept POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func DeclineFriendRequest(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := ags.DeclineFriendRequest(auth.AccessToken, c.Param("userId")); err != nil {
		respondError(c, err, "friends/:userId/decline POST")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
