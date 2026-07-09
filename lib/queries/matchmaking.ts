import axios from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { MatchTicket, MatchTicketStatus } from '@/lib/ags/matchmaking'
import { authHeaders } from './shared'
import type { AgsSession } from './shared'

export const useCreateMatchTicketMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: () => axios.post<MatchTicket>('/api/matchmaking', {}, { headers: authHeaders(session!) }).then((res) => res.data),
  })

export const useMatchTicketStatusQuery = (session: AgsSession | null, ticketId: string | null) =>
  useQuery({
    queryKey: ['matchTicketStatus', ticketId],
    queryFn: () =>
      axios.get<MatchTicketStatus>(`/api/matchmaking/${ticketId}`, { headers: authHeaders(session!) }).then((res) => res.data),
    enabled: !!session && !!ticketId,
    refetchInterval: 2000,
  })

export const useCancelMatchTicketMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: (ticketId: string) => axios.delete(`/api/matchmaking/${ticketId}`, { headers: authHeaders(session!) }),
  })
