import { pageMetadata } from '@/lib/metadata'
import { LeaderboardContainer } from '@/components/LeaderboardContainer'

export const metadata = pageMetadata(
  'Leaderboard | TypeSoFast!',
  'See how your typing speed ranks against other players.'
)

export default function LeaderboardPage() {
  return <LeaderboardContainer />
}
