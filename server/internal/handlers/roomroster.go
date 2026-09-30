package handlers

import (
	"sync"
	"time"

	"type-so-fast-server/internal/ags"
)

// Lobby has no channel to broadcast to, so every room event is addressed to an explicit list of
// user ids. Reading the AGS session to build that list on each room:progress would add a round
// trip to an event that fires twice a second per racer, so rosters are cached here. Starting a
// room locks it against further joins, which fixes the roster for the rest of the race; the TTL
// only needs to outlive a single race.
const rosterTTL = 5 * time.Minute

type roster struct {
	members []string
	expires time.Time
}

var (
	rosterMu    sync.Mutex
	roomRosters = map[string]roster{}
)

func memberIDs(members []ags.SessionMember) []string {
	ids := make([]string, 0, len(members))
	for _, member := range members {
		if member.UserID != "" {
			ids = append(ids, member.UserID)
		}
	}
	return ids
}

// Each Cloud Run instance keeps its own rosters. A miss just costs one AGS read, so instances
// never need to agree with each other.
func cacheRoster(sessionID string, members []string) {
	rosterMu.Lock()
	defer rosterMu.Unlock()
	roomRosters[sessionID] = roster{members: members, expires: time.Now().Add(rosterTTL)}
}

func cachedRoster(sessionID string) ([]string, bool) {
	rosterMu.Lock()
	defer rosterMu.Unlock()

	entry, found := roomRosters[sessionID]
	if !found || time.Now().After(entry.expires) {
		delete(roomRosters, sessionID)
		return nil, false
	}
	return entry.members, true
}

func roomMembers(accessToken, sessionID string) ([]string, error) {
	if members, found := cachedRoster(sessionID); found {
		return members, nil
	}

	room, err := ags.GetRoomSession(accessToken, sessionID)
	if err != nil {
		return nil, err
	}
	members := memberIDs(room.Members)
	cacheRoster(sessionID, members)
	return members, nil
}
