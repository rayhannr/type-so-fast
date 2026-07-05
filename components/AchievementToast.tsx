'use client'

import { useEffect } from 'react'
import type { UnlockedAchievement } from '@/lib/ags/achievements'

interface Props {
  achievement: UnlockedAchievement | null
  onDismiss: () => void
}

export const AchievementToast = ({ achievement, onDismiss }: Props) => {
  useEffect(() => {
    if (!achievement) return
    const timeout = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timeout)
  }, [achievement, onDismiss])

  if (!achievement) return null

  return (
    <div
      className="fixed bottom-6 right-6 bg-surface border border-solid border-edge rounded-lg shadow-lg px-5 py-3 font-inter"
      style={{ zIndex: 50 }}
    >
      <p className="text-xs uppercase tracking-wide text-accent">Achievement unlocked</p>
      <p className="font-semibold text-active">{achievement.name}</p>
    </div>
  )
}
