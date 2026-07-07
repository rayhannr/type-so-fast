'use client'

import { useEffect, useReducer, useRef } from 'react'
import { gameReducer, createInitialState } from './gameReducer'
import type { GameState, GameAction } from './gameReducer'
import { BOT_PROFILES } from './botDifficulty'
import type { Difficulty, BotProfile } from './botDifficulty'

const WRONG_CHAR_POOL = 'abcdefghijklmnopqrstuvwxyz'

const randomWrongChar = (expected: string): string => {
  let char = expected
  while (char === expected) {
    char = WRONG_CHAR_POOL[Math.floor(Math.random() * WRONG_CHAR_POOL.length)]
  }
  return char
}

const nextDelay = (profile: BotProfile): number => {
  const base = 1000 / profile.charsPerSecond
  const jitterRange = base * profile.jitter
  return base + (Math.random() * 2 - 1) * jitterRange
}

interface Params {
  words: string[]
  difficulty: Difficulty
  active: boolean
  duration: number
}

interface BotTypist {
  state: GameState
  dispatch: (action: GameAction) => void
}

export const useBotTypist = ({ words, difficulty, active, duration }: Params): BotTypist => {
  const [state, dispatch] = useReducer(gameReducer, words, (initialWords) => createInitialState(initialWords, duration))
  const wordsRef = useRef(words)
  const bufferRef = useRef('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // `words` only changes reference at restart boundaries (duration/difficulty change,
  // Tab/restart), not on every word the bot completes, so this only resets on a new round
  useEffect(() => {
    dispatch({ type: 'RESTART', words, duration })
    wordsRef.current = words
    bufferRef.current = ''
  }, [words, duration])

  useEffect(() => {
    if (!active) return

    const profile = BOT_PROFILES[difficulty]

    const step = () => {
      const currentWord = wordsRef.current[0]
      if (!currentWord) return

      const position = bufferRef.current.length
      if (position >= currentWord.length) {
        dispatch({ type: 'INPUT_CHANGE', value: bufferRef.current + ' ', currentWord })
        wordsRef.current = wordsRef.current.slice(1)
        bufferRef.current = ''
        timeoutRef.current = setTimeout(step, nextDelay(profile))
        return
      }

      const expectedChar = currentWord[position]
      const isMistake = Math.random() < profile.mistakeRate

      if (!isMistake) {
        bufferRef.current += expectedChar
        dispatch({ type: 'KEYSTROKE', correct: true })
        dispatch({ type: 'INPUT_CHANGE', value: bufferRef.current, currentWord })
        timeoutRef.current = setTimeout(step, nextDelay(profile))
        return
      }

      bufferRef.current += randomWrongChar(expectedChar)
      dispatch({ type: 'KEYSTROKE', correct: false, missedChar: expectedChar })
      dispatch({ type: 'INPUT_CHANGE', value: bufferRef.current, currentWord })

      const shouldShip = Math.random() < profile.shipRate
      if (shouldShip) {
        timeoutRef.current = setTimeout(step, nextDelay(profile))
        return
      }

      // slip-and-correct: notice the mistake and backspace it out before retrying
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = bufferRef.current.slice(0, -1)
        dispatch({ type: 'BACKSPACE' })
        dispatch({ type: 'INPUT_CHANGE', value: bufferRef.current, currentWord })
        timeoutRef.current = setTimeout(step, nextDelay(profile))
      }, nextDelay(profile))
    }

    timeoutRef.current = setTimeout(step, nextDelay(profile))

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [active, difficulty])

  return { state, dispatch }
}
