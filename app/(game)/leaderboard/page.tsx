import { Metadata } from 'next'
import { LeaderboardContainer } from '@/components/LeaderboardContainer'

export const metadata: Metadata = {
  title: 'TypeSoFast! — Leaderboard',
  description: 'See how your typing speed ranks against other players.'
}

export default function LeaderboardPage() {
  return <LeaderboardContainer />
}
