package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

func CreateMatchTicket(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	ticket, err := ags.CreateMatchTicket(auth.AccessToken)
	if err != nil {
		respondError(c, err, "matchmaking POST")
		return
	}
	c.JSON(http.StatusOK, ticket)
}

func GetMatchTicketStatus(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	status, err := ags.GetMatchTicketStatus(auth.AccessToken, c.Param("ticketId"))
	if err != nil {
		respondError(c, err, "matchmaking/:ticketId GET")
		return
	}
	c.JSON(http.StatusOK, status)
}

func CancelMatchTicket(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	if err := ags.CancelMatchTicket(auth.AccessToken, c.Param("ticketId")); err != nil {
		respondError(c, err, "matchmaking/:ticketId DELETE")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
