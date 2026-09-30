package ags

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"type-so-fast-server/internal/agsconfig"
)

// A player is online in AGS exactly while their Lobby websocket is held open, which the realtime
// relay does on their behalf. Nothing publishes presence explicitly.
const availabilityOnline = "online"

// The generated lobby-sdk presence client posts to an admin path this deployment rejects for a
// player token, so the documented public presence endpoint is called directly.
func userPresence(accessToken string, userIDs []string) (map[string]string, error) {
	body, err := json.Marshal(map[string][]string{"userIDs": userIDs})
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/lobby/v1/public/presence/namespaces/%s/users/presence",
		agsconfig.Player().BaseURL, agsconfig.Namespace())
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("presence lookup returned %s", resp.Status)
	}

	var decoded struct {
		Data []struct {
			UserID       string `json:"userID"`
			Availability string `json:"availability"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}

	availability := make(map[string]string, len(decoded.Data))
	for _, entry := range decoded.Data {
		availability[entry.UserID] = entry.Availability
	}
	return availability, nil
}

// OnlineFriendIDs is the snapshot a client needs on load; afterwards AGS pushes userStatusNotif
// over the same player's Lobby socket for every friend whose availability changes.
func OnlineFriendIDs(accessToken string) ([]string, error) {
	friendIDs, err := ListFriends(accessToken)
	if err != nil {
		return nil, err
	}
	if len(friendIDs) == 0 {
		return []string{}, nil
	}

	availability, err := userPresence(accessToken, friendIDs)
	if err != nil {
		return nil, err
	}

	online := []string{}
	for _, friendID := range friendIDs {
		if availability[friendID] == availabilityOnline {
			online = append(online, friendID)
		}
	}
	return online, nil
}
