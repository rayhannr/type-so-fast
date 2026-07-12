import { GameSessionApi } from '@accelbyte/sdk-session'
import { CreateGameSessionRequest, GameSessionResponse, UpdateGameSessionRequest } from '@accelbyte/sdk-session'
import axios from 'axios'
import { createSdk } from './sdk'

const PVP_SESSION_TEMPLATE = 'pvp-quick-match-session'
const ROOM_MAX_PLAYERS = 5

export interface SignalPayload {
  sdp: RTCSessionDescriptionInit
  candidates: RTCIceCandidateInit[]
}

export interface PvpSessionAttributes {
  mode: string
  duration: number
  language: string
  words: string[]
  authorityUserId: string
  // WebRTC signaling relayed through session attributes: AGS Lobby's websocket requires an
  // Authorization header at handshake time, which a browser WebSocket client can't send, so
  // there's no lower-latency channel available to us here — see docs/ags-plans/2026-07-07-pvp-quick-match.md.
  offer?: SignalPayload
  answer?: SignalPayload
}

export interface PvpSession {
  id: string
  members: { userID: string; status: string }[]
  attributes: Partial<PvpSessionAttributes>
}

// Reuses the PvP quick-match session template but overrides joinability to INVITE_ONLY and names
// both players directly in `teams`, bypassing Matchmaking entirely — the create-session call takes
// joinability/type/etc. from the template only when not provided in the request (confirmed via
// `ags session game-sessions create --help`), so no separate invite-only template is needed.
export const createInviteSession = async (accessToken: string, inviterUserId: string, inviteeUserId: string): Promise<PvpSession> => {
  const api = GameSessionApi(createSdk(accessToken))
  const { data } = await api.createGamesession({
    configurationName: PVP_SESSION_TEMPLATE,
    joinability: 'INVITE_ONLY',
    teams: [{ userIDs: [inviterUserId, inviteeUserId] }]
  } as CreateGameSessionRequest)
  return {
    id: data.id ?? '',
    members: (data.members ?? []).map(m => ({ userID: m.id ?? '', status: m.status ?? '' })),
    attributes: (data.attributes as Partial<PvpSessionAttributes>) ?? {}
  }
}

export const getSession = async (accessToken: string, sessionId: string): Promise<PvpSession> => {
  const api = GameSessionApi(createSdk(accessToken))
  const { data } = await api.getGamesession_BySessionId(sessionId)
  return {
    id: sessionId,
    members: (data.members ?? []).map(m => ({ userID: m.id ?? '', status: m.status ?? '' })),
    attributes: (data.attributes as Partial<PvpSessionAttributes>) ?? {}
  }
}

// AGS uses optimistic concurrency on game sessions (a `version` field that must match the
// current one or the PATCH 409s with VersionMismatch).
const PATCH_SESSION_MAX_ATTEMPTS = 5

// The VersionMismatch body names the winning version ("current session version : [5]") — retry
// with that, since a GET right after another write can keep returning a stale version.
const versionFromMismatchError = (err: unknown): number | null => {
  if (!axios.isAxiosError(err) || err.response?.data?.name !== 'VersionMismatch') return null
  const fromAttributes = Number(err.response.data.attributes?.version)
  if (Number.isInteger(fromAttributes) && fromAttributes > 0) return fromAttributes
  const fromMessage = /\[(\d+)\]/.exec(err.response.data.errorMessage ?? '')
  return fromMessage ? Number(fromMessage[1]) : null
}

const patchSessionWithRetry = async (
  api: ReturnType<typeof GameSessionApi>,
  sessionId: string,
  buildPatch: (current: GameSessionResponse) => UpdateGameSessionRequest
): Promise<void> => {
  // highest version reported by a VersionMismatch so far; beats a stale GET
  let reportedVersion = 0

  const patchOnce = async (): Promise<void> => {
    const { data: current } = await api.getGamesession_BySessionId(sessionId)
    const patch = buildPatch(current)
    await api.patchGamesession_BySessionId(sessionId, {
      ...patch,
      version: Math.max(patch.version ?? 0, reportedVersion)
    })
  }

  for (let attempt = 1; attempt <= PATCH_SESSION_MAX_ATTEMPTS; attempt++) {
    try {
      await patchOnce()
      return
    } catch (err) {
      const version = versionFromMismatchError(err)
      if (version === null || attempt === PATCH_SESSION_MAX_ATTEMPTS) throw err
      reportedVersion = Math.max(reportedVersion, version)
    }
  }
}

// AGS's PATCH replaces the whole `attributes` object rather than deep-merging it, so the merge
// with whatever's already there has to happen here against the freshest possible read — not on
// the client, where two concurrent writers (e.g. one seeding the word list, the other writing
// its WebRTC offer) can each hold a stale cached copy of the other's write and clobber it.
export const setSessionAttributes = async (
  accessToken: string,
  sessionId: string,
  attributes: Partial<PvpSessionAttributes> | Partial<RoomSessionAttributes>
): Promise<void> => {
  const api = GameSessionApi(createSdk(accessToken))
  await patchSessionWithRetry(api, sessionId, current => {
    return {
      attributes: { ...current.attributes, ...attributes },
      version: current.version
    } as UpdateGameSessionRequest
  })
}

export const leaveSession = async (accessToken: string, sessionId: string): Promise<void> => {
  const api = GameSessionApi(createSdk(accessToken))
  await api.deleteLeave_BySessionId(sessionId)
}

// The host (session leader) is the sole author of mode/duration/words — joiners only read them.
// Unlike PvpSessionAttributes there are no WebRTC signaling fields: room progress sync runs over
// Pusher, not peer connections, so session attributes only carry the shared race setup.
export interface RoomSessionAttributes {
  mode: string
  duration: number
  language: string
  words: string[]
  // Lobby vs race phase for joiners; AGS-level joinability is locked separately (see lockRoom).
  status: 'waiting' | 'racing'
  // Server timestamp (ms) the race actually started, shared by every client so wpm math uses the
  // same wall-clock origin instead of each client's own Date.now() at the moment it observed the
  // start — a client that observes the start late would otherwise compute wpm off a shifted clock.
  startedAt: number
}

export interface RoomSession {
  id: string
  leaderId: string
  members: { userID: string; status: string }[]
  // AGS only issues a join code for OPEN sessions; null once revoked (or if the session was
  // created with any other joinability).
  code: string | null
  attributes: Partial<RoomSessionAttributes>
}

const toRoomSession = (data: GameSessionResponse): RoomSession => ({
  id: data.id ?? '',
  leaderId: data.leaderID,
  members: (data.members ?? []).map(m => ({ userID: m.id ?? '', status: m.status ?? '' })),
  code: data.code ?? null,
  attributes: (data.attributes as Partial<RoomSessionAttributes>) ?? {}
})

export const getRoomSession = async (accessToken: string, sessionId: string): Promise<RoomSession> => {
  const api = GameSessionApi(createSdk(accessToken))
  const { data } = await api.getGamesession_BySessionId(sessionId)
  return toRoomSession(data)
}

// Room matches reuse the PvP template but override capacity and joinability per-call.
// OPEN is required, not a preference: generate-code silently returns no code at all on a
// CLOSED/INVITE_ONLY session, so the code-based join flow only exists for OPEN sessions.
// The room is locked against further joins when the host starts the match (see lockRoom).
export const createRoomSession = async (accessToken: string): Promise<RoomSession> => {
  const api = GameSessionApi(createSdk(accessToken))
  const { data } = await api.createGamesession({
    configurationName: PVP_SESSION_TEMPLATE,
    joinability: 'OPEN',
    minPlayers: 1,
    maxPlayers: ROOM_MAX_PLAYERS
  } as CreateGameSessionRequest)
  return toRoomSession(data)
}

// Leader-only: AGS rejects non-leader callers with 403 LeadershipRequired, so no caller-side
// host check is needed.
export const generateRoomCode = async (accessToken: string, sessionId: string): Promise<string> => {
  const api = GameSessionApi(createSdk(accessToken))
  const { data } = await api.updateCode_BySessionId(sessionId)
  if (!data.code) throw new Error(`AGS returned no join code for session ${sessionId} — is its joinability OPEN?`)
  return data.code
}

export const joinRoomByCode = async (accessToken: string, code: string): Promise<RoomSession> => {
  const api = GameSessionApi(createSdk(accessToken))
  const { data } = await api.createGamesessionJoinCode({ code })
  return toRoomSession(data)
}

// Called when the host starts the match: revokes the join code (leader-only, like generateRoomCode)
// and flips joinability to CLOSED so AGS itself refuses any further joins — the code becoming
// invalid alone wouldn't stop a direct join against a still-OPEN session.
export const lockRoom = async (accessToken: string, sessionId: string): Promise<void> => {
  const api = GameSessionApi(createSdk(accessToken))
  await api.deleteCode_BySessionId(sessionId)
  await patchSessionWithRetry(api, sessionId, current => {
    return {
      joinability: 'CLOSED',
      version: current.version
    } as UpdateGameSessionRequest
  })
}
