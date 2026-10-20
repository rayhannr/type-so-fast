import { Duration } from '@/components/DurationSelector'
import { Difficulty } from '@/lib/botDifficulty'
import { WordMode } from '@/lib/word-generators'

export interface RaceFinishedEvent {
  gameType: 'solo' | 'pvc' | 'pvp' | 'room'
  mode: WordMode
  duration: Duration
  wpm: number
  accuracy: number
  correctKeystroke: number
  wrongKeystroke: number
  correction: number
  wordsTyped: number
  difficulty?: Difficulty
  outcome?: 'win' | 'lose' | 'tie'
}
