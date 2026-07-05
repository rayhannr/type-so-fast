import { useEffect, useRef, useState } from 'react'
import { loginWithDeviceId } from './auth'
import { getOrCreateDisplayName } from './displayName'
import { getUnlockedAchievementCodes } from './achievements'

export interface AgsSessionState {
  userId: string | null
  displayName: string | null
  isReady: boolean
  unlockedAchievements: Set<string>
  setUnlockedAchievements: (codes: Set<string>) => void
}

export const useAgsSession = (): AgsSessionState => {
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set())
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const init = async () => {
      try {
        const session = await loginWithDeviceId()
        const name = await getOrCreateDisplayName(session.userId)
        const unlocked = await getUnlockedAchievementCodes(session.userId).catch(() => new Set<string>())

        setUserId(session.userId)
        setDisplayName(name)
        setUnlockedAchievements(unlocked)
      } catch {
        // AGS unavailable; game still works fully offline via localStorage fallbacks
      } finally {
        setIsReady(true)
      }
    }

    init()
  }, [])

  return { userId, displayName, isReady, unlockedAchievements, setUnlockedAchievements }
}
