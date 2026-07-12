import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { AgsProfile } from '@/lib/ags/profile'
import { authHeaders, AgsSession } from './shared'

export const useMyProfileQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['profile', session?.userId ?? ''],
    queryFn: async () => {
      const { data } = await axios.get<AgsProfile>('/api/profile', {
        headers: authHeaders(session!)
      })
      return data
    },
    enabled: !!session
  })
