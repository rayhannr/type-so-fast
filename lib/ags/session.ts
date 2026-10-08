export interface SignalPayload {
  sdp: RTCSessionDescriptionInit
  candidates: RTCIceCandidateInit[]
}

// set from the inviter's settings when an invite session is created; a matchmade one starts empty
export interface PvpSessionAttributes {
  mode: string
  duration: number
  language: string
}

// `ready` asks the peer to resend its latest offer/answer, which covers a signal sent before this
// side was listening. The authority's offer also carries the race setup.
export type PvpRaceSetup = PvpSessionAttributes & { words: string[] }

export type PvpSignalMessage = { kind: 'ready' } | ({ kind: 'offer' | 'answer'; race?: PvpRaceSetup } & SignalPayload)

export interface PvpSession {
  id: string
  members: { userID: string; status: string }[]
  attributes: Partial<PvpSessionAttributes>
}

// The host (session leader) is the sole author of mode/duration/words, joiners only read them.
export interface RoomSessionAttributes {
  mode: string
  duration: number
  language: string
  words: string[]
  // Lobby vs race phase for joiners; AGS-level joinability is locked separately (see lockRoom).
  status: 'waiting' | 'racing'
  // Server timestamp (ms) the race actually started, shared by every client so wpm math uses the
  // same wall-clock origin instead of each client's own Date.now() at the moment it observed the
  // start, a client that observes the start late would otherwise compute wpm off a shifted clock.
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
