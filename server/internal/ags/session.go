package ags

import (
	"errors"
	"regexp"
	"strconv"

	session "github.com/AccelByte/accelbyte-go-modular-sdk/session-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/session-sdk/pkg/sessionclient/game_session"
	"github.com/AccelByte/accelbyte-go-modular-sdk/session-sdk/pkg/sessionclientmodels"

	"type-so-fast-server/internal/agsconfig"
	"type-so-fast-server/internal/agserror"
)

const (
	pvpSessionTemplate = "pvp-quick-match-session"
	roomMaxPlayers     = 5
)

func newGameSessionService(accessToken string) *session.GameSessionService {
	configRepo := agsconfig.Player()
	return &session.GameSessionService{
		Client:           session.NewSessionClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

type SessionMember struct {
	UserID string `json:"userID"`
	Status string `json:"status"`
}

// RoomSession mirrors lib/ags/session.ts's RoomSession — Attributes stays untyped JSON since the
// caller only ever reads/writes a Partial<RoomSessionAttributes> subset.
type RoomSession struct {
	ID         string          `json:"id"`
	LeaderID   string          `json:"leaderId"`
	Members    []SessionMember `json:"members"`
	Code       *string         `json:"code"`
	Attributes interface{}     `json:"attributes"`
}

// PvpSession mirrors lib/ags/session.ts's PvpSession, used for direct match-invite acceptance.
type PvpSession struct {
	ID         string          `json:"id"`
	Members    []SessionMember `json:"members"`
	Attributes interface{}     `json:"attributes"`
}

func toMembers(members []*sessionclientmodels.ApimodelsUserResponse) []SessionMember {
	out := make([]SessionMember, 0, len(members))
	for _, m := range members {
		userID := ""
		if m.ID != nil {
			userID = *m.ID
		}
		status := ""
		if m.Status != nil {
			status = *m.Status
		}
		out = append(out, SessionMember{UserID: userID, Status: status})
	}
	return out
}

func toRoomSession(data *sessionclientmodels.ApimodelsGameSessionResponse) RoomSession {
	id := ""
	if data.ID != nil {
		id = *data.ID
	}
	leaderID := ""
	if data.LeaderID != nil {
		leaderID = *data.LeaderID
	}
	var code *string
	if data.Code != "" {
		c := data.Code
		code = &c
	}
	return RoomSession{ID: id, LeaderID: leaderID, Members: toMembers(data.Members), Code: code, Attributes: data.Attributes}
}

// CreateInviteSession reuses the PvP quick-match session template but overrides joinability to
// INVITE_ONLY and names both players directly in `teams`, bypassing Matchmaking entirely.
func CreateInviteSession(accessToken, inviterUserID, inviteeUserID string) (*PvpSession, error) {
	service := newGameSessionService(accessToken)
	params := game_session.NewCreateGameSessionParams()
	params.Namespace = agsconfig.Namespace()
	configName := pvpSessionTemplate
	joinability := sessionclientmodels.ApimodelsCreateGameSessionRequestJoinabilityINVITEONLY
	params.Body = &sessionclientmodels.ApimodelsCreateGameSessionRequest{
		ConfigurationName: &configName,
		Joinability:       &joinability,
		Teams:             []*sessionclientmodels.ModelsTeam{{UserIDs: []string{inviterUserID, inviteeUserID}}},
	}

	resp, err := service.CreateGameSessionShort(params)
	if err != nil {
		return nil, err
	}
	id := ""
	if resp.Data.ID != nil {
		id = *resp.Data.ID
	}
	return &PvpSession{ID: id, Members: toMembers(resp.Data.Members), Attributes: resp.Data.Attributes}, nil
}

// GetRoomSession fetches a room's live state (roster, code, attributes) for lobby polling.
func GetRoomSession(accessToken, sessionID string) (*RoomSession, error) {
	service := newGameSessionService(accessToken)
	params := game_session.NewGetGameSessionParams()
	params.Namespace = agsconfig.Namespace()
	params.SessionID = sessionID

	resp, err := service.GetGameSessionShort(params)
	if err != nil {
		return nil, err
	}
	room := toRoomSession(resp.Data)
	return &room, nil
}

// CreateRoomSession reuses the PvP quick-match template but overrides capacity/joinability — OPEN
// is required, not a preference: generate-code silently returns no code at all on a
// CLOSED/INVITE_ONLY session, so the code-based join flow only exists for OPEN sessions. The room
// is locked against further joins when the host starts the match (see LockRoom).
func CreateRoomSession(accessToken string) (*RoomSession, error) {
	service := newGameSessionService(accessToken)
	params := game_session.NewCreateGameSessionParams()
	params.Namespace = agsconfig.Namespace()
	configName := pvpSessionTemplate
	joinability := sessionclientmodels.ApimodelsCreateGameSessionRequestJoinabilityOPEN
	minPlayers := int32(1)
	maxPlayers := int32(roomMaxPlayers)
	params.Body = &sessionclientmodels.ApimodelsCreateGameSessionRequest{
		ConfigurationName: &configName,
		Joinability:       &joinability,
		MinPlayers:        &minPlayers,
		MaxPlayers:        &maxPlayers,
	}

	resp, err := service.CreateGameSessionShort(params)
	if err != nil {
		return nil, err
	}
	room := toRoomSession(resp.Data)
	return &room, nil
}

// GenerateRoomCode is leader-only: AGS rejects non-leader callers with 403 LeadershipRequired, so
// no caller-side host check is needed.
func GenerateRoomCode(accessToken, sessionID string) (string, error) {
	service := newGameSessionService(accessToken)
	params := game_session.NewGameSessionGenerateCodeParams()
	params.Namespace = agsconfig.Namespace()
	params.SessionID = sessionID

	resp, err := service.GameSessionGenerateCodeShort(params)
	if err != nil {
		return "", err
	}
	if resp.Data.Code == "" {
		return "", errors.New("AGS returned no join code for session " + sessionID + " — is its joinability OPEN?")
	}
	return resp.Data.Code, nil
}

// JoinRoomByCode surfaces AGS's join-by-code error codes (invalid/expired code, full session) as
// an *agserror.Detail so the frontend's joinRoomErrorMessage (lib/queries/rooms.ts) can map them
// to a specific message instead of a generic failure.
func JoinRoomByCode(accessToken, code string) (*RoomSession, error) {
	service := newGameSessionService(accessToken)
	params := game_session.NewPublicSessionJoinCodeParams()
	params.Namespace = agsconfig.Namespace()
	params.Body = &sessionclientmodels.ApimodelsJoinByCodeRequest{Code: &code}

	resp, err := service.PublicSessionJoinCodeShort(params)
	if err != nil {
		var badRequest *game_session.PublicSessionJoinCodeBadRequest
		if errors.As(err, &badRequest) {
			return nil, responseErrorDetail(400, badRequest.Payload)
		}
		var forbidden *game_session.PublicSessionJoinCodeForbidden
		if errors.As(err, &forbidden) {
			return nil, responseErrorDetail(403, forbidden.Payload)
		}
		var notFound *game_session.PublicSessionJoinCodeNotFound
		if errors.As(err, &notFound) {
			return nil, responseErrorDetail(404, notFound.Payload)
		}
		return nil, err
	}
	room := toRoomSession(resp.Data)
	return &room, nil
}

func responseErrorDetail(status int, payload *sessionclientmodels.ResponseError) *agserror.Detail {
	detail := &agserror.Detail{Status: status}
	if payload == nil {
		return detail
	}
	if payload.ErrorCode != nil {
		detail.ErrorCode = *payload.ErrorCode
	}
	if payload.ErrorMessage != nil {
		detail.ErrorMessage = *payload.ErrorMessage
	}
	return detail
}

// AGS uses optimistic concurrency on game sessions (a `version` field that must match the current
// one or the PATCH 409s with VersionMismatch).
const patchSessionMaxAttempts = 5

var versionFromMessage = regexp.MustCompile(`\[(\d+)\]`)

// versionFromConflict extracts the winning version AGS reports in a VersionMismatch conflict, so
// a retry can use it directly instead of relying on a GET that can still return a stale version
// right after another writer's PATCH.
func versionFromConflict(payload *sessionclientmodels.ResponseError) (int32, bool) {
	if payload == nil || payload.Name == nil || *payload.Name != "VersionMismatch" {
		return 0, false
	}
	if raw, ok := payload.Attributes["version"]; ok {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			return int32(v), true
		}
	}
	if payload.ErrorMessage != nil {
		if m := versionFromMessage.FindStringSubmatch(*payload.ErrorMessage); m != nil {
			if v, err := strconv.Atoi(m[1]); err == nil {
				return int32(v), true
			}
		}
	}
	return 0, false
}

// patchSessionWithRetry retries a PATCH against the freshest read after a VersionMismatch conflict
// — AGS's PATCH replaces the whole `attributes` object rather than deep-merging, so callers that
// only touch a few fields (e.g. joinability) still need the latest version, not a stale one.
func patchSessionWithRetry(service *session.GameSessionService, sessionID string, buildPatch func(current *sessionclientmodels.ApimodelsGameSessionResponse) *sessionclientmodels.ApimodelsUpdateGameSessionRequest) error {
	var reportedVersion int32

	patchOnce := func() error {
		getParams := game_session.NewGetGameSessionParams()
		getParams.Namespace = agsconfig.Namespace()
		getParams.SessionID = sessionID
		current, err := service.GetGameSessionShort(getParams)
		if err != nil {
			return err
		}

		patch := buildPatch(current.Data)
		version := reportedVersion
		if patch.Version != nil && *patch.Version > version {
			version = *patch.Version
		}
		patch.Version = &version

		patchParams := game_session.NewPatchUpdateGameSessionParams()
		patchParams.Namespace = agsconfig.Namespace()
		patchParams.SessionID = sessionID
		patchParams.Body = patch
		_, err = service.PatchUpdateGameSessionShort(patchParams)
		return err
	}

	for attempt := 1; attempt <= patchSessionMaxAttempts; attempt++ {
		err := patchOnce()
		if err == nil {
			return nil
		}
		var conflict *game_session.PatchUpdateGameSessionConflict
		if !errors.As(err, &conflict) || attempt == patchSessionMaxAttempts {
			return err
		}
		if version, ok := versionFromConflict(conflict.Payload); ok && version > reportedVersion {
			reportedVersion = version
		}
	}
	return nil
}

// GetSession fetches a session's live state as a PvpSession — used by the generic /api/session/:id
// route (direct match-invite / PvP session polling), unlike GetRoomSession's room-specific shape.
func GetSession(accessToken, sessionID string) (*PvpSession, error) {
	service := newGameSessionService(accessToken)
	params := game_session.NewGetGameSessionParams()
	params.Namespace = agsconfig.Namespace()
	params.SessionID = sessionID

	resp, err := service.GetGameSessionShort(params)
	if err != nil {
		return nil, err
	}
	return &PvpSession{ID: sessionID, Members: toMembers(resp.Data.Members), Attributes: resp.Data.Attributes}, nil
}

// SetSessionAttributes merges the given attributes into whatever's already on the session.
// AGS's PATCH replaces the whole `attributes` object rather than deep-merging it, so the merge
// has to happen here against the freshest possible read — not on the client, where two concurrent
// writers (e.g. one seeding the word list, the other writing its WebRTC offer) can each hold a
// stale cached copy of the other's write and clobber it.
func SetSessionAttributes(accessToken, sessionID string, attributes map[string]interface{}) error {
	service := newGameSessionService(accessToken)
	return patchSessionWithRetry(service, sessionID, func(current *sessionclientmodels.ApimodelsGameSessionResponse) *sessionclientmodels.ApimodelsUpdateGameSessionRequest {
		merged := map[string]interface{}{}
		if existing, ok := current.Attributes.(map[string]interface{}); ok {
			for k, v := range existing {
				merged[k] = v
			}
		}
		for k, v := range attributes {
			merged[k] = v
		}
		return &sessionclientmodels.ApimodelsUpdateGameSessionRequest{
			Attributes: merged,
			Version:    current.Version,
		}
	})
}

// LeaveSession removes the caller from the session (used when a player exits a PvP match or room).
func LeaveSession(accessToken, sessionID string) error {
	service := newGameSessionService(accessToken)
	params := game_session.NewLeaveGameSessionParams()
	params.Namespace = agsconfig.Namespace()
	params.SessionID = sessionID
	return service.LeaveGameSessionShort(params)
}

// LockRoom revokes the join code (leader-only, like GenerateRoomCode) and flips joinability to
// CLOSED so AGS itself refuses any further joins — the code becoming invalid alone wouldn't stop
// a direct join against a still-OPEN session.
func LockRoom(accessToken, sessionID string) error {
	service := newGameSessionService(accessToken)

	revokeParams := game_session.NewPublicRevokeGameSessionCodeParams()
	revokeParams.Namespace = agsconfig.Namespace()
	revokeParams.SessionID = sessionID
	if err := service.PublicRevokeGameSessionCodeShort(revokeParams); err != nil {
		return err
	}

	closed := sessionclientmodels.ApimodelsUpdateGameSessionRequestJoinabilityCLOSED
	return patchSessionWithRetry(service, sessionID, func(current *sessionclientmodels.ApimodelsGameSessionResponse) *sessionclientmodels.ApimodelsUpdateGameSessionRequest {
		return &sessionclientmodels.ApimodelsUpdateGameSessionRequest{
			Joinability: &closed,
			Version:     current.Version,
		}
	})
}
