import axios from 'axios'
import { useMutation } from '@tanstack/react-query'
import type { AgsSession } from './shared'

export const useLoginMutation = () =>
  useMutation({
    mutationFn: (deviceId: string) => axios.post<AgsSession>('/api/auth', { deviceId }).then((res) => res.data),
  })
