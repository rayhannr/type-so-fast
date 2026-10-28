import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { authHeaders, AgsSession } from './shared'

export const useLoginMutation = () =>
  useMutation({
    mutationFn: (deviceId: string) => axios.post<AgsSession>('/api/auth', { deviceId }).then(res => res.data)
  })

export const useGoogleLoginMutation = () =>
  useMutation({
    mutationFn: (idToken: string) => axios.post<AgsSession>('/api/auth/google', { idToken }).then(res => res.data)
  })

export const useRefreshSessionMutation = () =>
  useMutation({
    mutationFn: (refreshToken: string) => axios.post<AgsSession>('/api/auth/refresh', { refreshToken }).then(res => res.data)
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

// AGS IAM's platform token grant error when no user owns this Google account yet
export const isGoogleNotLinked = (error: unknown): boolean =>
  axios.isAxiosError(error) && (error.response?.data as { error?: string } | undefined)?.error === 'platform_not_linked'

export const useGoogleStatusQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['google-status', session?.userId ?? ''],
    queryFn: () =>
      axios
        .get<{ displayName: string | null; emailAddress: string | null } | null>('/api/auth/google-status', { headers: authHeaders(session!) })
        .then(res => res.data),
    enabled: !!session
  })
