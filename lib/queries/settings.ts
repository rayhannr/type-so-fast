import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { UserSettings } from '@/lib/ags/cloudsave'
import { authHeaders, AgsSession } from './shared'

const settingsKey = (userId: string) => ['settings', userId] as const

export const useSettingsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: settingsKey(session?.userId ?? ''),
    queryFn: () => axios.get<UserSettings>('/api/settings', { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session
  })

export const useSaveSettingsMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: UserSettings) => axios.put('/api/settings', { settings }, { headers: authHeaders(session!) }),
    onSuccess: (_, settings) => {
      if (session) queryClient.setQueryData(settingsKey(session.userId), settings)
    }
  })
}
