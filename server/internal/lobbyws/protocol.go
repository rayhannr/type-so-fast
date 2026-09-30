package lobbyws

import "strings"

// AGS Lobby frames are newline-delimited `key: value` text, not JSON. A freeform notification
// arrives as type `messageNotif` with the sender's payload carried verbatim in `payload`.
type frame map[string]string

func parseFrame(raw []byte) frame {
	f := frame{}
	for _, line := range strings.Split(string(raw), "\n") {
		line = strings.TrimRight(line, "\r")
		if line == "" {
			continue
		}
		key, value, found := strings.Cut(line, ":")
		if !found {
			continue
		}
		f[strings.TrimSpace(key)] = strings.TrimSpace(value)
	}
	return f
}
