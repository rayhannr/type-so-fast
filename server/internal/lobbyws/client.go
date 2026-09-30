package lobbyws

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const lobbyPingInterval = 30 * time.Second

// AGS Lobby authenticates only via an Authorization header on the handshake: no query parameter,
// no subprotocol, no post-connect auth frame. A browser WebSocket cannot set request headers, so
// the player's Lobby connection is held here and bridged down to the browser instead.
func dialLobby(accessToken string) (*websocket.Conn, error) {
	host := strings.TrimPrefix(os.Getenv("ACCELBYTE_BASE_URL"), "https://")
	header := http.Header{}
	header.Set("Authorization", "Bearer "+accessToken)

	conn, _, err := websocket.DefaultDialer.Dial("wss://"+host+"/lobby/", header)
	return conn, err
}

// Bridge pumps one player's Lobby socket down to their browser socket until either side closes.
// Cross-instance fan-out needs no shared bus: a sender calls Lobby's freeform-notify REST endpoint
// from any instance, and AGS routes the message to whichever instance holds that player's socket.
func Bridge(browser *websocket.Conn, accessToken string) error {
	lobby, err := dialLobby(accessToken)
	if err != nil {
		return err
	}
	defer lobby.Close()

	// The downstream pump blocks on Lobby reads, so a browser that goes away is only noticed on
	// the next write, which may never come. Draining the browser side closes Lobby as soon as it
	// disconnects rather than leaking the upstream connection until the next event.
	go func() {
		defer lobby.Close()
		for {
			if _, _, err := browser.ReadMessage(); err != nil {
				return
			}
		}
	}()

	go func() {
		ticker := time.NewTicker(lobbyPingInterval)
		defer ticker.Stop()
		for range ticker.C {
			if err := lobby.WriteControl(websocket.PingMessage, nil, time.Now().Add(5*time.Second)); err != nil {
				return
			}
		}
	}()

	for {
		_, raw, err := lobby.ReadMessage()
		if err != nil {
			return err
		}

		out, ok := browserMessage(parseFrame(raw))
		if !ok {
			continue
		}
		browser.SetWriteDeadline(time.Now().Add(10 * time.Second))
		if err := browser.WriteMessage(websocket.TextMessage, out); err != nil {
			return err
		}
	}
}

// browserMessage converts a Lobby frame into the JSON the browser expects, so the client never
// has to know Lobby's text protocol. Frames the client has no use for are dropped rather than
// forwarded as noise.
func browserMessage(f frame) ([]byte, bool) {
	switch f["type"] {
	case "messageNotif":
		// A freeform notification carries the app's own JSON verbatim, so it passes through
		// untouched and arrives at the client exactly as the sender wrote it.
		payload := f["payload"]
		if !json.Valid([]byte(payload)) {
			return nil, false
		}
		return []byte(payload), true

	case "userStatusNotif":
		// AGS emits this only for the recipient's own friends, and drives it off whether their
		// Lobby socket is held open, which for this game means whether the relay holds one.
		encoded, err := json.Marshal(map[string]string{
			"event":        "presence:changed",
			"userId":       f["userID"],
			"availability": f["availability"],
		})
		if err != nil {
			return nil, false
		}
		return encoded, true
	}
	return nil, false
}
