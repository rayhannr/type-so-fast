'use client'

import { Leaderboard } from '@/components/Leaderboard'
import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'

export const LeaderboardContainer = () => {
  const { session } = useAgsSessionContext()
  return <Leaderboard currentUserId={session?.userId ?? null} />
}
