import { Metadata } from 'next'
import { StatsTabContainer } from '@/components/StatsTabContainer'

export const metadata: Metadata = {
  title: 'TypeSoFast! — Stats',
  description: 'Track your typing speed history, streaks, and personal bests over time.'
}

export default function StatsPage() {
  return <StatsTabContainer />
}
