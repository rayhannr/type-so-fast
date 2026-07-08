import axios from 'axios'
import { Session } from '@accelbyte/sdk-session'
import { createSdk } from './sdk'

export interface SignalPayload {
  sdp: RTCSessionDescriptionInit
  candidates: RTCIceCandidateInit[]
}

export interface PvpSessionAttributes {
  mode: string
  duration: number
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

export const getSession = async (accessToken: string, sessionId: string): Promise<PvpSession> => {
  const { GameSessionApi } = Session
  const api = GameSessionApi(createSdk(accessToken))
  const { data } = await api.getGamesession_BySessionId(sessionId)
  return {
    id: sessionId,
    members: (data.members ?? []).map((m) => ({ userID: m.id ?? '', status: m.status ?? '' })),
    attributes: (data.attributes as Partial<PvpSessionAttributes>) ?? {},
  }
}

// Bypasses the SDK's patchGamesession_BySessionId — its zod schema requires the full session
// shape even for a partial PATCH, which rejects an attributes-only body. Raw REST call instead,
// same escape hatch lib/ags/auth.ts uses for device-id login.
// AGS uses optimistic concurrency on game sessions (a `version` field that must match the
// current one or the PATCH 400s with VersionMismatch) — fetch the live version right before
// writing and retry once if another client's write raced ahead of us.
// AGS's PATCH replaces the whole `attributes` object rather than deep-merging it, so the merge
// with whatever's already there has to happen here against the freshest possible read — not on
// the client, where two concurrent writers (e.g. one seeding the word list, the other writing
// its WebRTC offer) can each hold a stale cached copy of the other's write and clobber it.
export const setSessionAttributes = async (
  accessToken: string,
  sessionId: string,
  attributes: Partial<PvpSessionAttributes>
): Promise<void> => {
  const url = `${process.env.ACCELBYTE_BASE_URL}/session/v1/public/namespaces/${process.env.ACCELBYTE_NAMESPACE}/gamesessions/${sessionId}`
  const headers = { Authorization: `Bearer ${accessToken}` }

  const patchOnce = async (): Promise<void> => {
    const { data: current } = await axios.get(url, { headers })
    const merged = { ...current.attributes, ...attributes }
    await axios.patch(url, { attributes: merged, version: current.version }, { headers })
  }

  try {
    await patchOnce()
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data?.name === 'VersionMismatch') {
      await patchOnce()
      return
    }
    throw err
  }
}

export const leaveSession = async (accessToken: string, sessionId: string): Promise<void> => {
  const { GameSessionApi } = Session
  const api = GameSessionApi(createSdk(accessToken))
  await api.deleteLeave_BySessionId(sessionId)
}
