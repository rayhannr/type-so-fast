'use client'

import { AchievementsTab } from '@/components/AchievementsTab'
import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'

export default function AchievementsPage() {
  const { session } = useAgsSessionContext()
  return <AchievementsTab session={session} />
}
