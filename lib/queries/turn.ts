import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { authHeaders, AgsSession } from './shared'

// Keyed per match session so each match fetches fresh credentials once and keeps them for the
// whole handshake. No retry: a failure should fall back to STUN-only quickly, not hold the
// handshake up.
export const useTurnServersQuery = (session: AgsSession | null, sessionId: string) =>
  useQuery({
    queryKey: ['turnServers', sessionId],
    queryFn: () => axios.get<RTCIceServer[]>('/api/turn', { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session && !!sessionId,
    staleTime: Infinity,
    retry: false
  })
