import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { AgsSession } from './shared'

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
