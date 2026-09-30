package handlers

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"type-so-fast-server/internal/apiauth"
	"type-so-fast-server/internal/lobbyws"
)

// Browsers exempt WebSocket handshakes from the same-origin policy and send no preflight, so
// nothing rejects a cross-site upgrade on our behalf the way CORS would for the REST routes.
// ALLOWED_ORIGINS is the only thing standing between this endpoint and a page on any domain
// opening an authenticated socket against it.
func allowedOrigins() []string {
	raw := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
	origins := make([]string, 0, len(raw))
	for _, o := range raw {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

var upgrader = websocket.Upgrader{
	HandshakeTimeout: 10 * time.Second,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		for _, allowed := range allowedOrigins() {
			if origin == allowed {
				return true
			}
		}
		return false
	},
}

// Realtime bridges a browser to its player-scoped AGS Lobby socket. Credentials arrive in the
// first frame rather than the query string, since the handshake URL lands in access logs while a
// message body does not.
func Realtime(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	conn.SetReadDeadline(time.Now().Add(10 * time.Second))
	var hello struct {
		Token  string `json:"token"`
		UserID string `json:"userId"`
	}
	if err := conn.ReadJSON(&hello); err != nil {
		conn.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "expected auth frame"))
		return
	}
	conn.SetReadDeadline(time.Time{})

	auth := apiauth.FromHeaders("Bearer "+hello.Token, hello.UserID)
	if auth == nil {
		conn.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "unauthorized"))
		return
	}

	// An invalid token fails at the Lobby handshake, so no separate token check is needed here.
	if err := lobbyws.Bridge(conn, auth.AccessToken); err != nil {
		log.Printf("[realtime] bridge closed for %s: %v", auth.UserID, err)
	}
}
