import { pageMetadata } from '@/lib/metadata'
import { StatsTabContainer } from '@/components/StatsTabContainer'

export const metadata = pageMetadata(
  'Stats | TypeSoFast!',
  'Track your typing speed history, streaks, and personal bests over time.'
)

export default function StatsPage() {
  return <StatsTabContainer />
}
