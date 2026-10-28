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

// AGS IAM error code for a platform account that is already linked to another user:
// https://docs.accelbyte.io/gaming-services/knowledge-base/api-endpoints-error-codes/
const PLATFORM_ALREADY_LINKED = 10173

export const isGoogleLinkedElsewhere = (error: unknown): boolean =>
  axios.isAxiosError(error) && (error.response?.data as { errorCode?: number } | undefined)?.errorCode === PLATFORM_ALREADY_LINKED

export const useGoogleStatusQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['google-status', session?.userId ?? ''],
    queryFn: () =>
      axios
        .get<{ displayName: string | null; emailAddress: string | null } | null>('/api/auth/google-status', { headers: authHeaders(session!) })
        .then(res => res.data),
    enabled: !!session
  })
