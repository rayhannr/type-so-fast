import { Duration } from '@/components/DurationSelector'
import { WordMode } from '@/lib/word-generators'

export interface GameResultStats {
  wpm: number
  wordsTyped: number
  displayName: string
  duration: Duration
  mode: WordMode
  xpEarned: number
  level: number
}

export interface PersonalStats {
  bestWpm: number
  gamesPlayed: number
  totalWordsTyped: number
}
