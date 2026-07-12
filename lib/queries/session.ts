import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { PvpSession, PvpSessionAttributes } from '@/lib/ags/session'
import { authHeaders, AgsSession } from './shared'

export const useSessionQuery = (session: AgsSession | null, sessionId: string | null) =>
  useQuery({
    queryKey: ['pvpSession', sessionId],
    queryFn: () => axios.get<PvpSession>(`/api/session/${sessionId}`, { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session && !!sessionId,
    refetchInterval: 1500
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
