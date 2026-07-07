'use client'

import { Leaderboard } from '@/components/Leaderboard'
import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'

export default function LeaderboardPage() {
  const { session } = useAgsSessionContext()
  return <Leaderboard currentUserId={session?.userId ?? null} />
}
