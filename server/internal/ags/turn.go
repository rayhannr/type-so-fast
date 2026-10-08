package ags

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"type-so-fast-server/internal/agsconfig"
)

// IceServer is shaped like the browser's RTCIceServer so the client can hand it straight to
// RTCPeerConnection.
type IceServer struct {
	URLs       string `json:"urls"`
	Username   string `json:"username"`
	Credential string `json:"credential"`
}

type turnServer struct {
	IP     string `json:"ip"`
	Port   int    `json:"port"`
	Region string `json:"region"`
}

type turnCredential struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// TURN Manager calls go straight to REST: AccelByte publishes no turnmanager package in the Go
// modular SDK (or as @accelbyte/sdk-*), so there's no generated client to use. Paths match the
// official Unreal SDK's TurnManager API.
func getTurnManager(accessToken, path string, out interface{}) error {
	url := fmt.Sprintf("%s/turnmanager/%s", agsconfig.Player().BaseURL, path)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s: unexpected status %d", url, resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// TurnServers returns every TURN server in the namespace with a short-lived credential each. A
// server whose credential can't be fetched is skipped rather than failing the whole list.
func TurnServers(accessToken string) ([]IceServer, error) {
	var list struct {
		Servers []turnServer `json:"servers"`
	}
	if err := getTurnManager(accessToken, "turn", &list); err != nil {
		return nil, err
	}

	fetched := make([]*IceServer, len(list.Servers))
	var wg sync.WaitGroup
	for i, server := range list.Servers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			var credential turnCredential
			path := fmt.Sprintf("turn/secret/%s/%s/%d", server.Region, server.IP, server.Port)
			if err := getTurnManager(accessToken, path, &credential); err != nil {
				return
			}
			fetched[i] = &IceServer{
				URLs:       fmt.Sprintf("turn:%s:%d", server.IP, server.Port),
				Username:   credential.Username,
				Credential: credential.Password,
			}
		}()
	}
	wg.Wait()

	out := make([]IceServer, 0, len(fetched))
	for _, server := range fetched {
		if server != nil {
			out = append(out, *server)
		}
	}
	return out, nil
}
