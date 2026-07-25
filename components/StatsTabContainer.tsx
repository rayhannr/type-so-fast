'use client'

import { StatsTab } from '@/components/StatsTab'
import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'

export const StatsTabContainer = () => {
  const { session } = useAgsSessionContext()
  return <StatsTab session={session} />
}
