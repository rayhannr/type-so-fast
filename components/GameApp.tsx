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
import { StatsTab } from './StatsTab'

import { useAgsSession } from '@/lib/ags/useAgsSession'
import { useProgressionQuery } from '@/lib/queries'
import { useGameEndSync } from '@/lib/useGameEndSync'
import { playKeyClick, playErrorBuzz, playWordChime } from '@/lib/sounds'
import { gameReducer, createInitialState } from '@/lib/gameReducer'
import { LevelBadge } from './LevelBadge'

const numberOfWords = 400

export const GameApp = () => {
  const [state, dispatch] = useReducer(gameReducer, [], () => createInitialState([]))
  const [tab, setTab] = useState<Tab>('type')
  const [duration, setDuration] = useState<Duration>(60)
  const [mode, setMode] = useState<WordMode>('words')
  const [hasStarted, setHasStarted] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)

  const { session, displayName, unlockedAchievements } = useAgsSession()
  const progression = useProgressionQuery(session)

  const { xpGain, newAchievement, dismissAchievement } = useGameEndSync({
    timer: state.timer,
    correctKeystroke: state.correctKeystroke,
    wrongKeystroke: state.wrongKeystroke,
    correction: state.correction,
    correctWords: state.correctWords,
    duration,
    mode,
    session,
    displayName,
  })

  const currentWord: string = useMemo(() => state.words[0], [state.words])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasStartedRef = useRef<boolean>(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const keystrokeRef = useRef<Keystroke>({ id: 0, char: '' })

  // words are generated client-side only (random), so the initial fill happens in an effect
  useEffect(() => {
    dispatch({ type: 'RESTART', words: generateWords('words', numberOfWords), duration: 60 })
  }, [])

  useEffect(() => {
    if (tab === 'type') inputRef.current?.focus()
  }, [tab])

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
    setHasStarted(false)
    dispatch({ type: 'RESTART', words: generateWords(mode, numberOfWords), duration })
    inputRef.current?.focus()
  }, [mode, duration])

  const changeDuration = (nextDuration: Duration) => {
    if (hasStarted) return
    setDuration(nextDuration)
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
    dispatch({ type: 'RESTART', words: generateWords(mode, numberOfWords), duration: nextDuration })
  }

  const changeMode = (nextMode: WordMode) => {
    if (hasStarted) return
    setMode(nextMode)
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
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
            <LevelBadge xp={progression.data?.xp ?? 0} />
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
              <Result state={state} session={session} displayName={displayName} xpGain={xpGain} />
              <div className="flex justify-center items-center gap-2 mt-8">
                <span className="text-[10px] text-muted border border-solid border-edge rounded px-1 py-0.5">Tab</span>
                <RestartButton onClick={restartHandler} />
              </div>
            </div>
          ))}

        {tab === 'stats' && <StatsTab session={session} />}

        {tab === 'leaderboard' && <Leaderboard currentUserId={session?.userId ?? null} />}

        {tab === 'achievements' && <AchievementsTab unlockedCodes={unlockedAchievements} isLoggedIn={!!session} />}
      </div>
      <AchievementToast achievement={newAchievement} onDismiss={dismissAchievement} />
    </>
  )
}
