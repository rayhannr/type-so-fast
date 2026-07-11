import { WpmSample } from '@/components/SpeedCurve'
import { WordStat } from '@/components/AccuracyBreakdown'

export interface Keystroke {
  id: number
  char: string
}

export interface GameState {
  words: string[]
  wordInput: string
  isInputCorrect: boolean
  correctKeystroke: number
  wrongKeystroke: number
  correction: number
  correctWords: number
  wrongWords: number
  timer: number
  duration: number
  wpmSamples: WpmSample[]
  missMap: Record<string, number>
  wordStats: WordStat[]
}

export type GameAction =
  | { type: 'SET_WORDS'; words: string[] }
  | { type: 'INPUT_CHANGE'; value: string; currentWord: string }
  | { type: 'KEYSTROKE'; correct: boolean; missedChar?: string }
  | { type: 'BACKSPACE' }
  | { type: 'TICK' }
  | { type: 'RESTART'; words: string[]; duration: number }

export const createInitialState = (words: string[], duration: number = 60): GameState => ({
  words,
  wordInput: '',
  isInputCorrect: true,
  correctKeystroke: 0,
  wrongKeystroke: 0,
  correction: 0,
  correctWords: 0,
  wrongWords: 0,
  timer: duration,
  duration,
  wpmSamples: [],
  missMap: {},
  wordStats: [],
})

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SET_WORDS':
      return { ...state, words: action.words }
    case 'INPUT_CHANGE': {
      const { value, currentWord } = action
      const trimmed = value.trim()
      const isInputCorrect = !trimmed.length || !currentWord || trimmed === currentWord.slice(0, value.length)

      if (!value.endsWith(' ')) {
        return { ...state, wordInput: value, isInputCorrect }
      }

      const inputWord = value.slice(0, -1)
      const attempted = Math.max(inputWord.length, currentWord.length)
      let correctChars = 0
      for (let i = 0; i < Math.min(inputWord.length, currentWord.length); i++) {
        if (inputWord[i] === currentWord[i]) correctChars++
      }
      return {
        ...state,
        wordInput: '',
        isInputCorrect,
        correctWords: inputWord === currentWord ? state.correctWords + 1 : state.correctWords,
        wrongWords: inputWord === currentWord ? state.wrongWords : state.wrongWords + 1,
        words: state.words.slice(1),
        wordStats: state.wordStats.concat({ word: currentWord, correct: correctChars, attempted }),
      }
    }
    case 'KEYSTROKE': {
      const missed = action.missedChar?.toLowerCase()
      const missMap = missed ? { ...state.missMap, [missed]: (state.missMap[missed] ?? 0) + 1 } : state.missMap
      return action.correct
        ? { ...state, correctKeystroke: state.correctKeystroke + 1, missMap }
        : { ...state, wrongKeystroke: state.wrongKeystroke + 1, missMap }
    }
    case 'BACKSPACE':
      return { ...state, correction: state.correction + 1 }
    case 'TICK': {
      const timer = state.timer - 1
      const elapsed = state.duration - timer
      const wpmSamples =
        elapsed % 5 === 0
          ? state.wpmSamples.concat({ elapsed, wpm: Math.round((state.correctKeystroke * 12) / elapsed) })
          : state.wpmSamples
      return { ...state, timer, wpmSamples }
    }
    case 'RESTART':
      return createInitialState(action.words, action.duration)
    default:
      return state
  }
}
