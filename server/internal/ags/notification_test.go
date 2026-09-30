package ags

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestNotificationPayloadCarriesEventName(t *testing.T) {
	payload, err := notificationPayload("room:progress", map[string]any{"wpm": 72})
	if err != nil {
		t.Fatalf("notificationPayload: %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal([]byte(payload), &decoded); err != nil {
		t.Fatalf("payload is not valid JSON: %v", err)
	}
	if decoded["event"] != "room:progress" {
		t.Errorf("event = %v, want room:progress", decoded["event"])
	}
	if decoded["wpm"] != float64(72) {
		t.Errorf("wpm = %v, want 72", decoded["wpm"])
	}
}

func TestNotificationPayloadHandlesNilData(t *testing.T) {
	payload, err := notificationPayload("invite:declined", nil)
	if err != nil {
		t.Fatalf("notificationPayload: %v", err)
	}
	if payload != `{"event":"invite:declined"}` {
		t.Errorf("payload = %s", payload)
	}
}

// Live check that the generated SDK client reaches the real freeform-notify endpoint and that the
// payload survives the round trip down a Lobby websocket. Needs a player token, so it is skipped
// unless AB_TEST_PLAYER_TOKEN and AB_TEST_USER_ID are set alongside the usual server config.
func TestNotifyUserReachesLobbySocket(t *testing.T) {
	playerToken := os.Getenv("AB_TEST_PLAYER_TOKEN")
	userID := os.Getenv("AB_TEST_USER_ID")
	if playerToken == "" || userID == "" {
		t.Skip("set AB_TEST_PLAYER_TOKEN and AB_TEST_USER_ID to run the live notification check")
	}

	host := strings.TrimPrefix(os.Getenv("ACCELBYTE_BASE_URL"), "https://")
	header := http.Header{}
	header.Set("Authorization", "Bearer "+playerToken)
	conn, _, err := websocket.DefaultDialer.Dial("wss://"+host+"/lobby/", header)
	if err != nil {
		t.Fatalf("lobby dial: %v", err)
	}
	defer conn.Close()

	received := make(chan string, 4)
	go func() {
		for {
			_, raw, err := conn.ReadMessage()
			if err != nil {
				return
			}
			received <- string(raw)
		}
	}()
	time.Sleep(time.Second)

	if err := NotifyUser(userID, "room:progress", map[string]any{"wpm": 99}); err != nil {
		t.Fatalf("NotifyUser: %v", err)
	}

	for {
		select {
		case frame := <-received:
			if !strings.Contains(frame, "messageNotif") {
				continue
			}
			if !strings.Contains(frame, `"event":"room:progress"`) || !strings.Contains(frame, `"wpm":99`) {
				t.Fatalf("payload did not survive the round trip: %s", frame)
			}
			return
		case <-time.After(15 * time.Second):
			t.Fatal("no notification arrived within 15s")
		}
	}
}
