'use client'

import { useEffect, useReducer, useState, useMemo, useRef, useCallback } from 'react'
import type { ChangeEvent, InputEvent, KeyboardEvent } from 'react'
import { generateWords } from '@/lib/word-generators'
import type { WordMode } from '@/lib/word-generators'

import { Heading } from './Heading'
import { WordContainer } from './WordContainer'
import { Input } from './Input'
import { Result } from './Result'
import { Timer } from './Timer'
import { RestartButton } from './RestartButton'
import { Leaderboard } from './Leaderboard'
import { AchievementToast } from './AchievementToast'
import { AchievementsTab } from './AchievementsTab'
import { TypingHands } from './TypingHands'
import type { Keystroke } from './TypingHands'
import { TabNav } from './TabNav'
import type { Tab } from './TabNav'
import { ThemeToggle } from './ThemeToggle'
import { SoundToggle } from './SoundToggle'
import { AccentPicker } from './AccentPicker'
import { DurationSelector } from './DurationSelector'
import type { Duration } from './DurationSelector'
import { ModeSelector } from './ModeSelector'
import type { WpmSample } from './SpeedCurve'
import { StatsTab } from './StatsTab'
import type { WordStat } from './AccuracyBreakdown'

import { useAgsSession } from '@/lib/ags/useAgsSession'
import {
  apiGetStats,
  apiSubmitStats,
  apiGetRecords,
  apiSaveRecords,
  apiProcessAchievements,
  apiGetHistory,
  apiSaveHistory,
  apiGetStreak,
  apiSaveStreak,
  apiGetProgression,
  apiSaveProgression,
} from '@/lib/api'
import type { PersonalStats } from '@/lib/ags/statistics'
import type { UnlockedAchievement } from '@/lib/ags/achievements'
import { advanceStreak, advanceProgression, levelFromXp, HISTORY_LIMIT } from '@/lib/progress'
import { playKeyClick, playErrorBuzz, playWordChime, playFanfare } from '@/lib/sounds'
import type { GameHistoryEntry, ProgressionData, StreakData } from '@/lib/progress'
import { LevelBadge } from './LevelBadge'
import type { XpGain } from './Result'

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
  duration: number
  wpmSamples: WpmSample[]
  missMap: Record<string, number>
  wordStats: WordStat[]
}

type GameAction =
  | { type: 'SET_WORDS'; words: string[] }
  | { type: 'INPUT_CHANGE'; value: string; currentWord: string }
  | { type: 'KEYSTROKE'; correct: boolean; missedChar?: string }
  | { type: 'BACKSPACE' }
  | { type: 'TICK' }
  | { type: 'RESTART'; words: string[]; duration: number }

const createInitialState = (words: string[], duration: number = 60): GameState => ({
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

export const GameApp = () => {
  const [state, dispatch] = useReducer(gameReducer, [], () => createInitialState([]))
  const [records, setRecords] = useState<number[]>([])
  const [personalStats, setPersonalStats] = useState<PersonalStats | null>(null)
  const [history, setHistory] = useState<GameHistoryEntry[]>([])
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [progression, setProgression] = useState<ProgressionData | null>(null)
  const [xpGain, setXpGain] = useState<XpGain | null>(null)
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0)
  const [newAchievement, setNewAchievement] = useState<UnlockedAchievement | null>(null)
  const [tab, setTab] = useState<Tab>('type')
  const [duration, setDuration] = useState<Duration>(60)
  const [mode, setMode] = useState<WordMode>('words')
  const [hasStarted, setHasStarted] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)

  const { session, displayName, unlockedAchievements, setUnlockedAchievements } = useAgsSession()

  const currentWord: string = useMemo(() => state.words[0], [state.words])
  const totalKeyStrokes: number = useMemo(
    () => state.correctKeystroke + state.wrongKeystroke,
    [state.correctKeystroke, state.wrongKeystroke]
  )

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasStartedRef = useRef<boolean>(false)
  const hasSavedRef = useRef<boolean>(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const keystrokeRef = useRef<Keystroke>({ id: 0, char: '' })

  // words are generated client-side only (random), so the initial fill happens in an effect
  useEffect(() => {
    dispatch({ type: 'RESTART', words: generateWords('words', numberOfWords), duration: 60 })
  }, [])

  useEffect(() => {
    if (tab === 'type') inputRef.current?.focus()
  }, [tab])

  useEffect(() => {
    if (!session) {
      const userRecords = localStorage.getItem('bestRecords')
      setRecords(userRecords ? JSON.parse(userRecords) : [])
      const localHistory = localStorage.getItem('gameHistory')
      setHistory(localHistory ? JSON.parse(localHistory) : [])
      const localStreak = localStorage.getItem('dailyStreak')
      setStreak(localStreak ? JSON.parse(localStreak) : null)
      const localProgression = localStorage.getItem('progression')
      setProgression(localProgression ? JSON.parse(localProgression) : null)
      return
    }

    apiGetRecords(session).then(setRecords).catch(() => {})
    apiGetStats(session).then(setPersonalStats).catch(() => {})
    apiGetHistory(session)
      .then((entries) => {
        if (entries.length > 0) setHistory(entries)
      })
      .catch(() => {})
    apiGetStreak(session)
      .then((cloudStreak) => {
        if (cloudStreak) setStreak(cloudStreak)
      })
      .catch(() => {})
    apiGetProgression(session)
      .then((cloudProgression) => {
        if (cloudProgression) setProgression(cloudProgression)
      })
      .catch(() => {})
  }, [session])

  useEffect(() => {
    if (state.timer > 0) return
    if (hasSavedRef.current) return
    hasSavedRef.current = true

    playFanfare()

    const userResult = Math.round((state.correctKeystroke * 12) / state.duration)
    if (userResult <= 0) {
      setXpGain(null)
      return
    }

    let newRecords = records.concat(userResult)
    newRecords.sort((a: number, b: number) => b - a)
    newRecords = newRecords.slice(0, 5)

    localStorage.setItem('bestRecords', JSON.stringify(newRecords))
    setRecords(newRecords)

    const newHistory = history.concat({ wpm: userResult, timestamp: Date.now() }).slice(-HISTORY_LIMIT)
    localStorage.setItem('gameHistory', JSON.stringify(newHistory))
    setHistory(newHistory)

    const newStreak = advanceStreak(streak, new Date())
    localStorage.setItem('dailyStreak', JSON.stringify(newStreak))
    setStreak(newStreak)

    const accuracy = (state.correctKeystroke * 100) / (totalKeyStrokes + state.correction)

    const {
      progression: newProgression,
      earnedXp,
      leveledUp,
    } = advanceProgression(progression, {
      wpm: userResult,
      accuracy,
      wordsTyped: state.correctWords,
      mode,
      duration,
    })
    localStorage.setItem('progression', JSON.stringify(newProgression))
    setProgression(newProgression)
    setXpGain({ earned: earnedXp, totalXp: newProgression.xp, leveledUp })

    if (!session || !displayName) return

    apiSaveRecords(session, newRecords).catch(() => {})
    apiSaveHistory(session, newHistory).catch(() => {})
    apiSaveStreak(session, newStreak).catch(() => {})
    apiSaveProgression(session, newProgression).catch(() => {})

    const statsSubmitted = apiSubmitStats(session, {
      wpm: userResult,
      wordsTyped: state.correctWords,
      displayName,
      duration,
      mode,
      xpEarned: earnedXp,
      level: levelFromXp(newProgression.xp),
    })

    statsSubmitted
      .then(() => {
        setLeaderboardRefreshKey((prev) => prev + 1)
        return apiGetStats(session)
      })
      .then(setPersonalStats)
      .catch(() => {})

    // stat-tied achievements (first-game, speed tiers, level/volume milestones) unlock
    // server-side when stats land, so diff them only after the submission settles
    statsSubmitted
      .catch(() => {})
      .then(() =>
        apiProcessAchievements(session, {
          accuracy,
          previousCodes: [...unlockedAchievements],
          streak: newStreak.currentStreak,
          perfectStreak: newProgression.perfectStreak,
          modesPlayed: newProgression.modesPlayed,
          durationsPlayed: newProgression.durationsPlayed,
        })
      )
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
    const value = event.target.value
    if (value.endsWith(' ') && value.slice(0, -1) === currentWord) playWordChime()
    dispatch({ type: 'INPUT_CHANGE', value, currentWord })
  }

  const inputHandler = (event: InputEvent<HTMLInputElement>) => {
    // the InputEvent type declares `data` on the synthetic event, but at runtime
    // React still only populates it on the underlying native event
    const currentKey = event.nativeEvent.data
    if (currentKey?.length === 1) {
      keystrokeRef.current = { id: keystrokeRef.current.id + 1, char: currentKey }

      if (currentKey !== ' ') {
        if (!hasStartedRef.current) {
          hasStartedRef.current = true
          setHasStarted(true)
          timerHandler()
        }

        if (state.isInputCorrect) playKeyClick()
        else playErrorBuzz()

        // past the word's end the player should have pressed space, so the miss lands there
        const position = state.wordInput.length
        const expectedChar = currentWord && position < currentWord.length ? currentWord[position] : ' '
        dispatch({
          type: 'KEYSTROKE',
          correct: state.isInputCorrect,
          missedChar: currentKey === expectedChar ? undefined : expectedChar,
        })
      }
    }

    if (event.nativeEvent.inputType === 'deleteContentBackward') {
      keystrokeRef.current = { id: keystrokeRef.current.id + 1, char: '\b' }
      dispatch({ type: 'BACKSPACE' })
    }
  }

  const keyDownHandler = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState('CapsLock'))
  }

  const restartHandler = useCallback(() => {
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
    hasSavedRef.current = false
    setHasStarted(false)
    dispatch({ type: 'RESTART', words: generateWords(mode, numberOfWords), duration })
    inputRef.current?.focus()
  }, [mode, duration])

  const changeDuration = (nextDuration: Duration) => {
    if (hasStarted) return
    setDuration(nextDuration)
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
    hasSavedRef.current = false
    dispatch({ type: 'RESTART', words: generateWords(mode, numberOfWords), duration: nextDuration })
  }

  const changeMode = (nextMode: WordMode) => {
    if (hasStarted) return
    setMode(nextMode)
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
    hasSavedRef.current = false
    dispatch({ type: 'RESTART', words: generateWords(nextMode, numberOfWords), duration })
  }

  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Tab') return
      event.preventDefault()
      restartHandler()
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [restartHandler])

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

  const elapsed = state.duration - state.timer
  const liveWpm = elapsed > 0 ? (state.correctKeystroke * 12) / elapsed : 0
  const isGameOver = state.timer === 0

  return (
    <>
      <TypingHands keystrokeRef={keystrokeRef} gameOver={isGameOver} />
      <div className="relative font-inter min-h-screen max-w-5xl mx-auto px-6 md:px-10 pt-8 pb-16">
        <header className="flex flex-row items-center justify-between">
          <Heading />
          <div className="flex flex-row items-center gap-3">
            <LevelBadge xp={progression?.xp ?? 0} />
            <AccentPicker session={session} />
            <SoundToggle />
            <ThemeToggle />
            <a
              href="https://github.com/rayhannr/type-so-fast"
              target="_blank"
              rel="noreferrer"
              aria-label="Source code on GitHub"
              className="text-muted hover:text-active transition-colors p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </header>

        <TabNav active={tab} onChange={setTab} />

        {tab === 'type' &&
          (!isGameOver ? (
            <div className="max-w-3xl mx-auto mt-10 md:mt-14">
              <div className="flex flex-col items-center gap-2 mb-6">
                <DurationSelector active={duration} disabled={hasStarted} onChange={changeDuration} />
                <ModeSelector active={mode} disabled={hasStarted} onChange={changeMode} />
              </div>
              <div className="flex flex-row items-center justify-between mb-4">
                <Timer timer={state.timer} />
                <div className="flex flex-row items-center gap-2">
                  {capsLockOn && <span className="text-xs text-error">Caps Lock is on</span>}
                  <span className="text-[10px] text-muted border border-solid border-edge rounded px-1 py-0.5">Tab</span>
                  <RestartButton onClick={restartHandler} />
                </div>
              </div>
              <Input
                ref={inputRef}
                value={state.wordInput}
                disabled={isGameOver}
                onChange={changeHandler}
                onInput={inputHandler}
                onKeyDown={keyDownHandler}
                autoFocus
              />
              <WordContainer
                words={state.words}
                typedInput={state.wordInput}
                wpm={liveWpm}
                wrongKeystroke={state.wrongKeystroke}
                onFocusRequest={() => inputRef.current?.focus()}
              />
            </div>
          ) : (
            <div className="mt-10">
              <Result
                wpm={Math.round((state.correctKeystroke * 12) / state.duration)}
                correctKeystroke={state.correctKeystroke}
                wrongKeystroke={state.wrongKeystroke}
                accuracy={((state.correctKeystroke * 100) / (totalKeyStrokes + state.correction)).toFixed(2)}
                correctWords={state.correctWords}
                wrongWords={state.wrongWords}
                personalStats={personalStats}
                records={records}
                clearRecords={clearRecords}
                samples={state.wpmSamples}
                missMap={state.missMap}
                wordStats={state.wordStats}
                duration={state.duration}
                displayName={displayName}
                xpGain={xpGain}
              />
              <div className="flex justify-center items-center gap-2 mt-8">
                <span className="text-[10px] text-muted border border-solid border-edge rounded px-1 py-0.5">Tab</span>
                <RestartButton onClick={restartHandler} />
              </div>
            </div>
          ))}

        {tab === 'stats' && (
          <StatsTab personalStats={personalStats} history={history} streak={streak} isLoggedIn={!!session} />
        )}

        {tab === 'leaderboard' && <Leaderboard refreshKey={leaderboardRefreshKey} currentUserId={session?.userId ?? null} />}

        {tab === 'achievements' && <AchievementsTab unlockedCodes={unlockedAchievements} isLoggedIn={!!session} />}
      </div>
      <AchievementToast achievement={newAchievement} onDismiss={() => setNewAchievement(null)} />
    </>
  )
}
