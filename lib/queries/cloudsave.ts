import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GameHistoryEntry, StreakData, ProgressionData, PvcData, PvpData, RoomData } from '@/lib/progress'
import { authHeaders, readLocal, writeLocal, AgsSession } from './shared'

// a cloud-save resource is read from `url` and cached under `queryKey` when signed in, or
// falls back to `localStorageKey` in localStorage otherwise; `bodyKey` is the field name the
// PUT endpoint expects the value under
const makeCloudSaveResource = <T,>(queryKey: string, url: string, localStorageKey: string, defaultValue: T, bodyKey: string) => {
  const useResourceQuery = (session: AgsSession | null) =>
    useQuery({
      queryKey: [queryKey, session?.userId ?? 'local'],
      queryFn: () =>
        session
          ? axios.get<T>(url, { headers: authHeaders(session) }).then((res) => res.data)
          : Promise.resolve(readLocal<T>(localStorageKey, defaultValue)),
      initialData: session ? undefined : () => readLocal<T>(localStorageKey, defaultValue),
    })

  const useSaveMutation = (session: AgsSession | null) => {
    const queryClient = useQueryClient()
    const key = [queryKey, session?.userId ?? 'local']
    return useMutation({
      mutationFn: async (value: T) => {
        if (session) await axios.put(url, { [bodyKey]: value }, { headers: authHeaders(session) })
        else writeLocal(localStorageKey, value)
      },
      onSuccess: (_, value) => queryClient.setQueryData(key, value),
    })
  }

  return { useResourceQuery, useSaveMutation }
}

const recordsResource = makeCloudSaveResource<number[]>('records', '/api/records', 'bestRecords', [], 'records')
export const useRecordsQuery = recordsResource.useResourceQuery
export const useSaveRecordsMutation = recordsResource.useSaveMutation

const historyResource = makeCloudSaveResource<GameHistoryEntry[]>('history', '/api/history', 'gameHistory', [], 'entries')
export const useHistoryQuery = historyResource.useResourceQuery
export const useSaveHistoryMutation = historyResource.useSaveMutation

const streakResource = makeCloudSaveResource<StreakData | null>('streak', '/api/streak', 'dailyStreak', null, 'streak')
export const useStreakQuery = streakResource.useResourceQuery
export const useSaveStreakMutation = streakResource.useSaveMutation

const progressionResource = makeCloudSaveResource<ProgressionData | null>(
  'progression',
  '/api/progression',
  'progression',
  null,
  'progression'
)
export const useProgressionQuery = progressionResource.useResourceQuery
export const useSaveProgressionMutation = progressionResource.useSaveMutation

const pvcProgressResource = makeCloudSaveResource<PvcData | null>('pvcProgress', '/api/pvc-progress', 'pvcProgress', null, 'pvc')
export const usePvcProgressQuery = pvcProgressResource.useResourceQuery
export const useSavePvcProgressMutation = pvcProgressResource.useSaveMutation

const pvpProgressResource = makeCloudSaveResource<PvpData | null>('pvpProgress', '/api/pvp-progress', 'pvpProgress', null, 'pvp')
export const usePvpProgressQuery = pvpProgressResource.useResourceQuery
export const useSavePvpProgressMutation = pvpProgressResource.useSaveMutation

const roomProgressResource = makeCloudSaveResource<RoomData | null>('roomProgress', '/api/room-progress', 'roomProgress', null, 'room')
export const useRoomProgressQuery = roomProgressResource.useResourceQuery
export const useSaveRoomProgressMutation = roomProgressResource.useSaveMutation
