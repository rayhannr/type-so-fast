import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { agsErrorMessage, authHeaders, AgsSession } from './shared'

export const useLoginMutation = () =>
  useMutation({
    mutationFn: (deviceId: string) => axios.post<AgsSession>('/api/auth', { deviceId }).then(res => res.data)
  })

export const useGoogleLoginMutation = () =>
  useMutation({
    mutationFn: (idToken: string) => axios.post<AgsSession>('/api/auth/google', { idToken }).then(res => res.data)
  })

export const useLinkGoogleMutation = () =>
  useMutation({
    mutationFn: ({ session, idToken }: { session: AgsSession; idToken: string }) =>
      axios.post('/api/auth/link-google', { ...session, idToken })
  })

export const useUnlinkGoogleMutation = () =>
  useMutation({
    mutationFn: (session: AgsSession) => axios.post('/api/auth/unlink-google', session)
  })

// AGS IAM link-platform error codes:
// https://docs.accelbyte.io/gaming-services/knowledge-base/api-endpoints-error-codes/
const linkGoogleErrorMessages: Record<number, string> = {
  10173: 'This Google account is already linked to another account.'
}

export const linkGoogleErrorMessage = (error: unknown): string =>
  agsErrorMessage(error, linkGoogleErrorMessages, 'Could not link this Google account.')

export const useGoogleStatusQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['google-status', session?.userId ?? ''],
    queryFn: () =>
      axios
        .get<{ displayName: string | null } | null>('/api/auth/google-status', { headers: authHeaders(session!) })
        .then(res => res.data),
    enabled: !!session
  })
