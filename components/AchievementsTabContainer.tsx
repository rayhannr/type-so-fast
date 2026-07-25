'use client'

import { AchievementsTab } from '@/components/AchievementsTab'
import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'

export const AchievementsTabContainer = () => {
  const { session } = useAgsSessionContext()
  return <AchievementsTab session={session} />
}
