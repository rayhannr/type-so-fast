import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { UserSummary } from '@/lib/ags/displayName'
import { RoomSession, RoomSessionAttributes } from '@/lib/ags/session'
import { agsErrorMessage, authHeaders, AgsSession } from './shared'

export interface RoomSessionWithNames extends RoomSession {
  memberNames: UserSummary[]
}

const roomKey = (sessionId: string) => ['room', sessionId]

export const useCreateRoomMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: () => axios.post<RoomSession>('/api/rooms', {}, { headers: authHeaders(session!) }).then(res => res.data)
  })

// Poll fallback for the lobby roster/attributes alongside the live Pusher channel
// (useRoomChannel) — a joiner who was already in the room before this client subscribed
// wouldn't otherwise show up, since room:joined only fires for joins that happen after
// subscription.
export const useRoomQuery = (session: AgsSession | null, sessionId: string | null) =>
  useQuery({
    queryKey: roomKey(sessionId ?? ''),
    queryFn: () => axios.get<RoomSessionWithNames>(`/api/rooms/${sessionId}`, { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session && !!sessionId,
    refetchInterval: 2000
  })

export const useSetRoomAttributesMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, attributes }: { sessionId: string; attributes: Partial<RoomSessionAttributes> }) =>
      axios.patch(`/api/session/${sessionId}`, { attributes }, { headers: authHeaders(session!) }),
    onSuccess: (_, { sessionId, attributes }) => {
      queryClient.setQueryData(roomKey(sessionId), (current: RoomSessionWithNames | undefined) =>
        current ? { ...current, attributes: { ...current.attributes, ...attributes } } : current
      )
    }
  })
}

// AGS Session join-by-code error codes — confirmed live against namespace bahlil-etanol (see
// docs/ags-plans/2026-07-08-room-code-match.md's join-by-code/joinability verification):
// SessionCodeNotFound fires for both a made-up code and a revoked/expired one (AGS doesn't
// distinguish the two), so both map to the same "invalid or expired" message.
const joinRoomErrorMessages: Record<number, string> = {
  20077: "That code isn't valid — double-check it and try again.", // JoinNotAllowedInvalidCode
  20052: 'Invalid or expired code — check with the host and try again.', // SessionCodeNotFound
  20032: 'Join session is not allowed — Session is full'
}

export const joinRoomErrorMessage = (error: unknown): string =>
  agsErrorMessage(error, joinRoomErrorMessages, 'Invalid or expired code — check with the host and try again.')

export const useJoinRoomMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: (code: string) =>
      axios.post<RoomSession>('/api/rooms/join', { code }, { headers: authHeaders(session!) }).then(res => res.data)
  })

export const useStartRoomMutation = (session: AgsSession | null) =>
  useMutation({
    // the setup rides along so the route can embed it in the room:start broadcast; startedAt is
    // generated server-side and returned so every client shares one race origin
    mutationFn: ({ sessionId, ...setup }: { sessionId: string } & Omit<RoomSessionAttributes, 'status' | 'startedAt'>) =>
      axios.post<{ ok: true; startedAt: number }>(`/api/rooms/${sessionId}/start`, setup, { headers: authHeaders(session!) })
  })

export interface RoomProgress {
  sessionId: string
  wpm: number
  progress: number
  sentAt: number
  // marks this as the sender's true final result (their own race ended) so opponents can tell a
  // still-in-progress reading apart from the one they should actually compare against
  final: boolean
}

export const useSendRoomProgressMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: ({ sessionId, wpm, progress, sentAt, final }: RoomProgress) =>
      axios.post(`/api/rooms/${sessionId}/progress`, { wpm, progress, sentAt, final }, { headers: authHeaders(session!) })
  })
