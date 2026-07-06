'use client'

import { useEffect, useRef, useState } from 'react'
import { apiAuth, apiGetDisplayName, apiGetAchievements, type AgsSession } from '../api'
import type { UnlockedAchievement } from './achievements'

const getDeviceId = (): string => {
  const key = 'deviceId'
  const existing = localStorage.getItem(key)
  if (existing) return existing

  const id = crypto.randomUUID()
  localStorage.setItem(key, id)
  return id
}

interface AgsSessionState {
  session: AgsSession | null
  displayName: string | null
  isReady: boolean
  unlockedAchievements: Set<string>
  setUnlockedAchievements: (codes: Set<string>) => void
}

export const useAgsSession = (): AgsSessionState => {
  const [session, setSession] = useState<AgsSession | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set())
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const init = async () => {
      try {
        const deviceId = getDeviceId()
        const agsSession = await apiAuth(deviceId)

        const localName = localStorage.getItem('displayName') ?? undefined
        const name = await apiGetDisplayName(agsSession, localName)
        localStorage.setItem('displayName', name)

        const achievements = await apiGetAchievements(agsSession).catch(() => [] as UnlockedAchievement[])
        const codes = new Set(achievements.map((a) => a.achievementCode))

        setSession(agsSession)
        setDisplayName(name)
        setUnlockedAchievements(codes)
      } catch {
        // AGS unavailable; game still works via localStorage fallbacks
      } finally {
        setIsReady(true)
      }
    }

    init()
  }, [])

  return { session, displayName, isReady, unlockedAchievements, setUnlockedAchievements }
}
