'use client'

import { StatsTab } from '@/components/StatsTab'
import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'

export default function StatsPage() {
  const { session } = useAgsSessionContext()
  return <StatsTab session={session} />
}
