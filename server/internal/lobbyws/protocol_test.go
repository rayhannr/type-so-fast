package lobbyws

import "testing"

func TestParseFrameConnectNotif(t *testing.T) {
	raw := []byte("type: connectNotif\nloginType: NewRegister\nreconnectFromCode: 5000\n" +
		"lobbySessionID: 0ad74c31c2fc4a75a6038239a1401967\nsequenceID: 1790775947\nsequenceNumber: 1\n")

	f := parseFrame(raw)

	if f["type"] != "connectNotif" {
		t.Errorf("type = %q, want connectNotif", f["type"])
	}
	if f["lobbySessionID"] != "0ad74c31c2fc4a75a6038239a1401967" {
		t.Errorf("lobbySessionID = %q", f["lobbySessionID"])
	}
	if len(f) != 6 {
		t.Errorf("parsed %d keys, want 6", len(f))
	}
}

// A freeform payload is JSON, so its own colons must survive: only the first colon on a line
// separates key from value.
func TestParseFrameKeepsColonsInValue(t *testing.T) {
	raw := []byte(`type: messageNotif` + "\n" + `payload: {"event":"room:progress","wpm":72}`)

	f := parseFrame(raw)

	if want := `{"event":"room:progress","wpm":72}`; f["payload"] != want {
		t.Errorf("payload = %q, want %q", f["payload"], want)
	}
}

func TestParseFrameSkipsMalformedLines(t *testing.T) {
	f := parseFrame([]byte("type: connectNotif\n\ngarbage-with-no-separator\n"))

	if len(f) != 1 {
		t.Errorf("parsed %d keys, want 1", len(f))
	}
}
