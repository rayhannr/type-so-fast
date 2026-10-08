import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { PvpSession, PvpSignalMessage } from '@/lib/ags/session'
import { agsErrorMessage, authHeaders, AgsSession } from './shared'

const pvpSessionErrorMessages: Record<number, string> = {
  20042: 'This match no longer exists.' // SessionIDNotFound
}

export const pvpSessionErrorMessage = (error: unknown): string =>
  agsErrorMessage(error, pvpSessionErrorMessages, "Couldn't set up the match. Try again.")

export const useSessionQuery = (session: AgsSession | null, sessionId: string | null) =>
  useQuery({
    queryKey: ['pvpSession', sessionId],
    queryFn: () => axios.get<PvpSession>(`/api/session/${sessionId}`, { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session && !!sessionId
  })

export const useSignalSessionMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: PvpSignalMessage }) =>
      axios.post(`/api/session/${sessionId}/signal`, message, { headers: authHeaders(session!) })
  })

export const useJoinSessionMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => axios.post(`/api/session/${sessionId}/join`, {}, { headers: authHeaders(session!) }),
    onSuccess: (_, sessionId) => queryClient.invalidateQueries({ queryKey: ['pvpSession', sessionId] })
  })
}

export const useLeaveSessionMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: (sessionId: string) => axios.delete(`/api/session/${sessionId}`, { headers: authHeaders(session!) })
  })
