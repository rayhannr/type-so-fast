package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

// Presence resolves the caller's friend list server-side rather than taking ids from the query
// string, so a client cannot probe the presence of users it isn't friends with.
func Presence(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	online, err := ags.OnlineFriendIDs(auth.AccessToken)
	if err != nil {
		respondError(c, err, "presence GET")
		return
	}
	c.JSON(http.StatusOK, gin.H{"online": online})
}
