'use client'

import { useEffect, useReducer, useState, useMemo, useRef } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { indonesianWords, shuffleWord } from '@/constants/words'

import { Heading } from './Heading'
import { WordContainer } from './WordContainer'
import { Input } from './Input'
import { Result } from './Result'
import { Timer } from './Timer'
import { RestartButton } from './RestartButton'
import { Records } from './Records'
import { Leaderboard } from './Leaderboard'
import { AchievementToast } from './AchievementToast'

import { useAgsSession } from '@/lib/ags/useAgsSession'
import { apiGetStats, apiSubmitStats, apiGetRecords, apiSaveRecords, apiProcessAchievements } from '@/lib/api'
import type { PersonalStats } from '@/lib/ags/statistics'
import type { UnlockedAchievement } from '@/lib/ags/achievements'

const numberOfWords = 400

interface GameState {
  words: string[]
  wordInput: string
  isInputCorrect: boolean
  correctKeystroke: number
  wrongKeystroke: number
  correction: number
  correctWords: number
  wrongWords: number
  timer: number
}

type GameAction =
  | { type: 'SET_WORDS'; words: string[] }
  | { type: 'INPUT_CHANGE'; value: string; currentWord: string }
  | { type: 'KEYSTROKE'; correct: boolean }
  | { type: 'BACKSPACE' }
  | { type: 'TICK' }
  | { type: 'RESTART'; words: string[] }

const createInitialState = (words: string[]): GameState => ({
  words,
  wordInput: '',
  isInputCorrect: true,
  correctKeystroke: 0,
  wrongKeystroke: 0,
  correction: 0,
  correctWords: 0,
  wrongWords: 0,
  timer: 60,
})

const gameReducer = (state: GameState, action: GameAction): GameState => {
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
      return {
        ...state,
        wordInput: '',
        isInputCorrect,
        correctWords: inputWord === currentWord ? state.correctWords + 1 : state.correctWords,
        wrongWords: inputWord === currentWord ? state.wrongWords : state.wrongWords + 1,
        words: state.words.slice(1),
      }
    }
    case 'KEYSTROKE':
      return action.correct
        ? { ...state, correctKeystroke: state.correctKeystroke + 1 }
        : { ...state, wrongKeystroke: state.wrongKeystroke + 1 }
    case 'BACKSPACE':
      return { ...state, correction: state.correction + 1 }
    case 'TICK':
      return { ...state, timer: state.timer - 1 }
    case 'RESTART':
      return createInitialState(action.words)
    default:
      return state
  }
}

export const GameApp = () => {
  const [state, dispatch] = useReducer(gameReducer, [], () => createInitialState([]))
  const [records, setRecords] = useState<number[]>([])
  const [personalStats, setPersonalStats] = useState<PersonalStats | null>(null)
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0)
  const [newAchievement, setNewAchievement] = useState<UnlockedAchievement | null>(null)

  const { session, displayName, unlockedAchievements, setUnlockedAchievements } = useAgsSession()

  const currentWord: string = useMemo(() => state.words[0], [state.words])
  const totalKeyStrokes: number = useMemo(
    () => state.correctKeystroke + state.wrongKeystroke,
    [state.correctKeystroke, state.wrongKeystroke]
  )

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasStartedRef = useRef<boolean>(false)
  const hasSavedRef = useRef<boolean>(false)

  useEffect(() => {
    const shuffledWords: string[] = shuffleWord(indonesianWords, numberOfWords)
    dispatch({ type: 'SET_WORDS', words: shuffledWords })
  }, [])

  useEffect(() => {
    if (!session) {
      const userRecords = localStorage.getItem('bestRecords')
      setRecords(userRecords ? JSON.parse(userRecords) : [])
      return
    }

    apiGetRecords(session).then(setRecords).catch(() => {})
    apiGetStats(session).then(setPersonalStats).catch(() => {})
  }, [session])

  useEffect(() => {
    if (state.timer > 0) return
    if (hasSavedRef.current) return
    hasSavedRef.current = true

    const userResult = Math.round(state.correctKeystroke / 5)
    if (userResult <= 0) return

    let newRecords = records.concat(userResult)
    newRecords.sort((a: number, b: number) => b - a)

    if (newRecords.length > 3) {
      newRecords = newRecords.slice(0, -1)
    }

    localStorage.setItem('bestRecords', JSON.stringify(newRecords))
    setRecords(newRecords)

    if (!session || !displayName) return

    const accuracy = (state.correctKeystroke * 100) / (totalKeyStrokes + state.correction)

    apiSaveRecords(session, newRecords).catch(() => {})

    apiSubmitStats(session, { wpm: userResult, wordsTyped: state.correctWords, displayName })
      .then(() => {
        setLeaderboardRefreshKey((prev) => prev + 1)
        return apiGetStats(session)
      })
      .then(setPersonalStats)
      .catch(() => {})

    apiProcessAchievements(session, accuracy, [...unlockedAchievements])
      .then((newlyUnlocked) => {
        if (newlyUnlocked.length === 0) return
        setUnlockedAchievements(new Set([...unlockedAchievements, ...newlyUnlocked.map((a) => a.achievementCode)]))
        setNewAchievement(newlyUnlocked[0])
      })
      .catch(() => {})
  }, [state.timer, state.correctKeystroke])

  const timerHandler = () => {
    let timesLeft: number = state.timer
    intervalRef.current = setInterval(() => {
      timesLeft -= 1
      dispatch({ type: 'TICK' })

      if (timesLeft <= 0) {
        clearInterval(intervalRef.current!)
      }
    }, 1000)
  }

  const changeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'INPUT_CHANGE', value: event.target.value, currentWord })
  }

  const inputHandler = (event: FormEvent<HTMLInputElement>) => {
    const nativeEvent = event.nativeEvent as InputEvent
    const currentKey = nativeEvent.data
    if (currentKey?.length === 1 && currentKey !== ' ') {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true
        timerHandler()
      }

      dispatch({ type: 'KEYSTROKE', correct: state.isInputCorrect })
    }

    if (nativeEvent.inputType === 'deleteContentBackward') {
      dispatch({ type: 'BACKSPACE' })
    }
  }

  const restartHandler = () => {
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
    hasSavedRef.current = false
    dispatch({ type: 'RESTART', words: shuffleWord(indonesianWords, numberOfWords) })
  }

  const clearRecords = () => {
    const bestRecords = localStorage.getItem('bestRecords')
    if (bestRecords) {
      localStorage.removeItem('bestRecords')
      setRecords([])
    }
    if (session) {
      apiSaveRecords(session, []).catch(() => {})
    }
  }

  return (
    <>
      <a
        href="https://github.com/rayhannr/type-so-fast"
        target="_blank"
        rel="noreferrer"
        className="absolute font-inter flex flex-row items-center"
        style={{ top: 20, right: 20 }}
      >
        <p className="text-gray-600 mr-3">Source code</p>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#4B5563">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      </a>
      <div className="font-inter p-8 pt-16 md:p-14 md:pt-20 lg:p-16 lg:pt-24">
        <Heading />
        <div className="lg:flex lg:flex-row lg:justify-center lg:items-start">
          <div className="md:max-w-4xl lg:max-w-2xl xl:max-w-3xl lg:mr-8">
            <WordContainer words={state.words} isInputCorrect={state.isInputCorrect || state.wordInput.length === 0} />
            <div className="lg:flex lg:flex-row lg:justify-between lg:items-start mt-6 md:mt-8">
              <div className="flex flex-row items-center justify-center">
                <Input value={state.wordInput} disabled={state.timer === 0} onChange={changeHandler} onInput={inputHandler} />
                <Timer timer={state.timer} />
                <RestartButton onClick={restartHandler} />
              </div>
              <Records records={records} clearRecords={clearRecords} />
            </div>
          </div>

          {state.timer === 0 && (
            <div>
              <Result
                wpm={Math.round(state.correctKeystroke / 5)}
                correctKeystroke={state.correctKeystroke}
                wrongKeystroke={state.wrongKeystroke}
                accuracy={((state.correctKeystroke * 100) / (totalKeyStrokes + state.correction)).toFixed(2)}
                correctWords={state.correctWords}
                wrongWords={state.wrongWords}
                personalStats={personalStats}
              />
              <Leaderboard refreshKey={leaderboardRefreshKey} currentUserId={session?.userId ?? null} />
            </div>
          )}
        </div>
      </div>
      <AchievementToast achievement={newAchievement} onDismiss={() => setNewAchievement(null)} />
    </>
  )
}
