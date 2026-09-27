import { pageMetadata } from '@/lib/metadata'
import { AchievementsTabContainer } from '@/components/AchievementsTabContainer'

export const metadata = pageMetadata(
  'Achievements | TypeSoFast!',
  'View unlocked achievements and track progress toward the ones you have left.'
)

export default function AchievementsPage() {
  return <AchievementsTabContainer />
}
