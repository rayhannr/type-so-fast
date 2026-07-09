import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { authHeaders, readLocal, writeLocal } from './shared'
import type { AgsSession } from './shared'

export const useDisplayNameQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['displayName', session?.userId ?? ''],
    queryFn: async () => {
      const localName = readLocal<string | null>('displayName', null) ?? undefined
      const { data } = await axios.get<{ displayName: string }>('/api/display-name', {
        headers: authHeaders(session!),
        params: localName ? { localName } : undefined,
      })
      writeLocal('displayName', data.displayName)
      return data.displayName
    },
    enabled: !!session,
  })
