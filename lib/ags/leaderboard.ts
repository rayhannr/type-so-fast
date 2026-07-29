export type LeaderboardRange = 'alltime' | 'weekly'
export type LeaderboardMetric = 'wpm' | 'xp'

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  wpm: number
}
