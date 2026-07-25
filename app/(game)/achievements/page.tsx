import { Metadata } from 'next'
import { AchievementsTabContainer } from '@/components/AchievementsTabContainer'

export const metadata: Metadata = {
  title: 'TypeSoFast! — Achievements',
  description: 'View unlocked achievements and track progress toward the ones you have left.'
}

export default function AchievementsPage() {
  return <AchievementsTabContainer />
}
