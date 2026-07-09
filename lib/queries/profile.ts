import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import type { AgsProfile } from '@/lib/ags/profile'
import { authHeaders } from './shared'
import type { AgsSession } from './shared'

export const useMyProfileQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['profile', session?.userId ?? ''],
    queryFn: async () => {
      const { data } = await axios.get<AgsProfile>('/api/profile', {
        headers: authHeaders(session!),
      })
      return data
    },
    enabled: !!session,
  })
