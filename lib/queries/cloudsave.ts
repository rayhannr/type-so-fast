import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GameHistoryEntry, StreakData, ProgressionData, PvcData, PvpData } from '@/lib/progress'
import { authHeaders, readLocal, writeLocal } from './shared'
import type { AgsSession } from './shared'

export const useRecordsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['records', session?.userId ?? 'local'],
    queryFn: () =>
      session
        ? axios.get<number[]>('/api/records', { headers: authHeaders(session) }).then((res) => res.data)
        : Promise.resolve(readLocal<number[]>('bestRecords', [])),
    initialData: session ? undefined : () => readLocal<number[]>('bestRecords', []),
  })

export const useSaveRecordsMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  const key = ['records', session?.userId ?? 'local']
  return useMutation({
    mutationFn: async (records: number[]) => {
      if (session) await axios.put('/api/records', { records }, { headers: authHeaders(session) })
      else writeLocal('bestRecords', records)
    },
    onSuccess: (_, records) => queryClient.setQueryData(key, records),
  })
}

export const useHistoryQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['history', session?.userId ?? 'local'],
    queryFn: () =>
      session
        ? axios.get<GameHistoryEntry[]>('/api/history', { headers: authHeaders(session) }).then((res) => res.data)
        : Promise.resolve(readLocal<GameHistoryEntry[]>('gameHistory', [])),
    initialData: session ? undefined : () => readLocal<GameHistoryEntry[]>('gameHistory', []),
  })

export const useSaveHistoryMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  const key = ['history', session?.userId ?? 'local']
  return useMutation({
    mutationFn: async (entries: GameHistoryEntry[]) => {
      if (session) await axios.put('/api/history', { entries }, { headers: authHeaders(session) })
      else writeLocal('gameHistory', entries)
    },
    onSuccess: (_, entries) => queryClient.setQueryData(key, entries),
  })
}

export const useStreakQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['streak', session?.userId ?? 'local'],
    queryFn: () =>
      session
        ? axios.get<StreakData | null>('/api/streak', { headers: authHeaders(session) }).then((res) => res.data)
        : Promise.resolve(readLocal<StreakData | null>('dailyStreak', null)),
    initialData: session ? undefined : () => readLocal<StreakData | null>('dailyStreak', null),
  })

export const useSaveStreakMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  const key = ['streak', session?.userId ?? 'local']
  return useMutation({
    mutationFn: async (streak: StreakData) => {
      if (session) await axios.put('/api/streak', { streak }, { headers: authHeaders(session) })
      else writeLocal('dailyStreak', streak)
    },
    onSuccess: (_, streak) => queryClient.setQueryData(key, streak),
  })
}

export const useProgressionQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['progression', session?.userId ?? 'local'],
    queryFn: () =>
      session
        ? axios.get<ProgressionData | null>('/api/progression', { headers: authHeaders(session) }).then((res) => res.data)
        : Promise.resolve(readLocal<ProgressionData | null>('progression', null)),
    initialData: session ? undefined : () => readLocal<ProgressionData | null>('progression', null),
  })

export const useSaveProgressionMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  const key = ['progression', session?.userId ?? 'local']
  return useMutation({
    mutationFn: async (progression: ProgressionData) => {
      if (session) await axios.put('/api/progression', { progression }, { headers: authHeaders(session) })
      else writeLocal('progression', progression)
    },
    onSuccess: (_, progression) => queryClient.setQueryData(key, progression),
  })
}

export const usePvcProgressQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['pvcProgress', session?.userId ?? 'local'],
    queryFn: () =>
      session
        ? axios.get<PvcData | null>('/api/pvc-progress', { headers: authHeaders(session) }).then((res) => res.data)
        : Promise.resolve(readLocal<PvcData | null>('pvcProgress', null)),
    initialData: session ? undefined : () => readLocal<PvcData | null>('pvcProgress', null),
  })

export const useSavePvcProgressMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  const key = ['pvcProgress', session?.userId ?? 'local']
  return useMutation({
    mutationFn: async (pvc: PvcData) => {
      if (session) await axios.put('/api/pvc-progress', { pvc }, { headers: authHeaders(session) })
      else writeLocal('pvcProgress', pvc)
    },
    onSuccess: (_, pvc) => queryClient.setQueryData(key, pvc),
  })
}

export const usePvpProgressQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['pvpProgress', session?.userId ?? 'local'],
    queryFn: () =>
      session
        ? axios.get<PvpData | null>('/api/pvp-progress', { headers: authHeaders(session) }).then((res) => res.data)
        : Promise.resolve(readLocal<PvpData | null>('pvpProgress', null)),
    initialData: session ? undefined : () => readLocal<PvpData | null>('pvpProgress', null),
  })

export const useSavePvpProgressMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  const key = ['pvpProgress', session?.userId ?? 'local']
  return useMutation({
    mutationFn: async (pvp: PvpData) => {
      if (session) await axios.put('/api/pvp-progress', { pvp }, { headers: authHeaders(session) })
      else writeLocal('pvpProgress', pvp)
    },
    onSuccess: (_, pvp) => queryClient.setQueryData(key, pvp),
  })
}
