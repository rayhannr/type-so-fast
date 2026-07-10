import { PublicPlayerRecordApi } from '@accelbyte/sdk-cloudsave'
import { createSdk } from './sdk'
import type { GameHistoryEntry, ProgressionData, PvcData, PvpData, RoomData, StreakData } from '@/lib/progress'

const RECORDS_KEY = 'bestRecords'
const HISTORY_KEY = 'gameHistory'
const STREAK_KEY = 'dailyStreak'
const SETTINGS_KEY = 'settings'
const PROGRESSION_KEY = 'progression'
const PVC_KEY = 'pvcProgress'
const PVP_KEY = 'pvpProgress'
const ROOM_KEY = 'roomProgress'

export interface UserSettings {
  accentColor?: string
}

export const getBestRecords = async (userId: string, accessToken: string): Promise<number[]> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))

  try {
    const { data } = await playerRecordApi.getRecord_ByUserId_ByKey(userId, RECORDS_KEY)
    return (data.value as { records?: number[] })?.records ?? []
  } catch {
    return []
  }
}

export const saveBestRecords = async (userId: string, accessToken: string, records: number[]): Promise<void> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))
  await playerRecordApi.createRecord_ByUserId_ByKey(userId, RECORDS_KEY, { records })
}

export const getGameHistory = async (userId: string, accessToken: string): Promise<GameHistoryEntry[]> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))

  try {
    const { data } = await playerRecordApi.getRecord_ByUserId_ByKey(userId, HISTORY_KEY)
    return (data.value as { entries?: GameHistoryEntry[] })?.entries ?? []
  } catch {
    return []
  }
}

export const saveGameHistory = async (userId: string, accessToken: string, entries: GameHistoryEntry[]): Promise<void> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))
  await playerRecordApi.createRecord_ByUserId_ByKey(userId, HISTORY_KEY, { entries })
}

export const getStreak = async (userId: string, accessToken: string): Promise<StreakData | null> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))

  try {
    const { data } = await playerRecordApi.getRecord_ByUserId_ByKey(userId, STREAK_KEY)
    const value = data.value as StreakData | undefined
    return value?.lastPlayedDate ? value : null
  } catch {
    return null
  }
}

export const saveStreak = async (userId: string, accessToken: string, streak: StreakData): Promise<void> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))
  await playerRecordApi.createRecord_ByUserId_ByKey(userId, STREAK_KEY, { ...streak })
}

export const getProgression = async (userId: string, accessToken: string): Promise<ProgressionData | null> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))

  try {
    const { data } = await playerRecordApi.getRecord_ByUserId_ByKey(userId, PROGRESSION_KEY)
    const value = data.value as ProgressionData | undefined
    return typeof value?.xp === 'number' ? value : null
  } catch {
    return null
  }
}

export const saveProgression = async (userId: string, accessToken: string, progression: ProgressionData): Promise<void> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))
  await playerRecordApi.createRecord_ByUserId_ByKey(userId, PROGRESSION_KEY, { ...progression })
}

export const getPvcProgress = async (userId: string, accessToken: string): Promise<PvcData | null> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))

  try {
    const { data } = await playerRecordApi.getRecord_ByUserId_ByKey(userId, PVC_KEY)
    const value = data.value as PvcData | undefined
    return typeof value?.legendWinStreak === 'number' ? value : null
  } catch {
    return null
  }
}

export const savePvcProgress = async (userId: string, accessToken: string, pvc: PvcData): Promise<void> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))
  await playerRecordApi.createRecord_ByUserId_ByKey(userId, PVC_KEY, { ...pvc })
}

export const getPvpProgress = async (userId: string, accessToken: string): Promise<PvpData | null> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))

  try {
    const { data } = await playerRecordApi.getRecord_ByUserId_ByKey(userId, PVP_KEY)
    const value = data.value as PvpData | undefined
    return typeof value?.winStreak === 'number' ? value : null
  } catch {
    return null
  }
}

export const savePvpProgress = async (userId: string, accessToken: string, pvp: PvpData): Promise<void> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))
  await playerRecordApi.createRecord_ByUserId_ByKey(userId, PVP_KEY, { ...pvp })
}

export const getRoomProgress = async (userId: string, accessToken: string): Promise<RoomData | null> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))

  try {
    const { data } = await playerRecordApi.getRecord_ByUserId_ByKey(userId, ROOM_KEY)
    const value = data.value as RoomData | undefined
    return typeof value?.winStreak === 'number' ? value : null
  } catch {
    return null
  }
}

export const saveRoomProgress = async (userId: string, accessToken: string, room: RoomData): Promise<void> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))
  await playerRecordApi.createRecord_ByUserId_ByKey(userId, ROOM_KEY, { ...room })
}

export const getSettings = async (userId: string, accessToken: string): Promise<UserSettings> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))

  try {
    const { data } = await playerRecordApi.getRecord_ByUserId_ByKey(userId, SETTINGS_KEY)
    return (data.value as UserSettings) ?? {}
  } catch {
    return {}
  }
}

export const saveSettings = async (userId: string, accessToken: string, settings: UserSettings): Promise<void> => {
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))
  await playerRecordApi.createRecord_ByUserId_ByKey(userId, SETTINGS_KEY, { ...settings })
}
