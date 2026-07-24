import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { PvpSession, PvpSessionAttributes } from '@/lib/ags/session'
import { authHeaders, AgsSession } from './shared'

// pollIntervalMs defaults to 1500 for steady-state polling (room lobby waits, race setup), but
// the WebRTC handshake is latency-sensitive enough to warrant a tighter interval while it's live —
// callers pass a shorter value only for the 'connecting' phase so we're not hammering AGS the rest
// of the time. Pass `false` once nothing in `attributes` can change anymore (race underway/over) so
// the query stops refetching instead of polling forever off the back of a still-set sessionId.
export const useSessionQuery = (session: AgsSession | null, sessionId: string | null, pollIntervalMs: number | false = 1500) =>
  useQuery({
    queryKey: ['pvpSession', sessionId],
    queryFn: () => axios.get<PvpSession>(`/api/session/${sessionId}`, { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session && !!sessionId,
    refetchInterval: pollIntervalMs
  })

// the writer already knows the exact resulting attributes (it just built them), so update the
// cache immediately rather than waiting on the next poll tick — otherwise the writer's own view
// of `attributes` can lag behind actions (e.g. the WebRTC handshake) that don't wait on that poll
export const useSetSessionAttributesMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, attributes }: { sessionId: string; attributes: Partial<PvpSessionAttributes> }) =>
      axios.patch(`/api/session/${sessionId}`, { attributes }, { headers: authHeaders(session!) }),
    onSuccess: (_, { sessionId, attributes }) => {
      queryClient.setQueryData(['pvpSession', sessionId], (current: PvpSession | undefined) =>
        current ? { ...current, attributes: { ...current.attributes, ...attributes } } : current
      )
    }
  })
}

export const useLeaveSessionMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: (sessionId: string) => axios.delete(`/api/session/${sessionId}`, { headers: authHeaders(session!) })
  })
