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
