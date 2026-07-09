'use client'

import { useEffect, useReducer, useState, useMemo, useRef, useCallback } from 'react'
import type { ChangeEvent, InputEvent, KeyboardEvent } from 'react'
import { generateWords } from '@/lib/word-generators'

import { WordContainer } from './WordContainer'
import { Input } from './Input'
import { Result } from './Result'
import { Timer } from './Timer'
import { RestartButton } from './RestartButton'
import { AchievementToast } from './AchievementToast'
import { TypingHands } from './TypingHands'
import type { Keystroke } from './TypingHands'
import { DurationSelector } from './DurationSelector'
import type { Duration } from './DurationSelector'
import { DifficultySelector } from './DifficultySelector'
import type { Difficulty } from '@/lib/botDifficulty'

import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'
import { useGameEndSync } from '@/hooks/useGameEndSync'
import { useBotTypist } from '@/hooks/useBotTypist'
import { playKeyClick, playErrorBuzz, playWordChime } from '@/lib/sounds'
import { gameReducer, createInitialState } from '@/lib/gameReducer'

const numberOfWords = 400

type Outcome = 'win' | 'lose' | 'tie'

const OUTCOME_LABEL: Record<Outcome, string> = { win: 'You Win!', lose: 'Bot Wins', tie: "It's a Tie" }
const OUTCOME_CLASS: Record<Outcome, string> = { win: 'text-correct', lose: 'text-error', tie: 'text-active' }

export const PvcGame = () => {
  const [state, dispatch] = useReducer(gameReducer, [], () => createInitialState([]))
  const [raceWords, setRaceWords] = useState<string[]>([])
  const [duration, setDuration] = useState<Duration>(60)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [hasStarted, setHasStarted] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)

  const { session, displayName } = useAgsSessionContext()

  const currentWord: string = useMemo(() => state.words[0], [state.words])
  const isGameOver = state.timer === 0

  const bot = useBotTypist({ words: raceWords, difficulty, active: hasStarted && !isGameOver, duration })

  const playerWpm = Math.round((state.correctKeystroke * 12) / state.duration)
  const botWpm = Math.round((bot.state.correctKeystroke * 12) / state.duration)

  let outcome: Outcome | null = null
  if (isGameOver) {
    if (playerWpm === botWpm) outcome = 'tie'
    else outcome = playerWpm > botWpm ? 'win' : 'lose'
  }

  const { xpGain, newAchievement, dismissAchievement } = useGameEndSync({
    timer: state.timer,
    correctKeystroke: state.correctKeystroke,
    wrongKeystroke: state.wrongKeystroke,
    correction: state.correction,
    correctWords: state.correctWords,
    duration,
    mode: 'words',
    session,
    displayName,
    pvc: isGameOver ? { difficulty, won: outcome === 'win' } : undefined,
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasStartedRef = useRef<boolean>(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const keystrokeRef = useRef<Keystroke>({ id: 0, char: '' })

  const startRound = (nextDuration: Duration) => {
    const words = generateWords('words', numberOfWords)
    dispatch({ type: 'RESTART', words, duration: nextDuration })
    setRaceWords(words)
  }

  // words are generated client-side only (random), so the initial fill happens in an effect
  useEffect(() => {
    startRound(60)
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const timerHandler = () => {
    let timesLeft: number = state.timer
    intervalRef.current = setInterval(() => {
      timesLeft -= 1
      dispatch({ type: 'TICK' })
      bot.dispatch({ type: 'TICK' })

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
    startRound(duration)
    inputRef.current?.focus()
  }, [duration])

  const changeDuration = (nextDuration: Duration) => {
    if (hasStarted) return
    setDuration(nextDuration)
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
    startRound(nextDuration)
  }

  const changeDifficulty = (nextDifficulty: Difficulty) => {
    if (hasStarted) return
    setDifficulty(nextDifficulty)
  }

  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault()
        restartHandler()
        return
      }

      // focusing here (before the browser's default insert action runs) means the
      // keystroke that triggered this still lands in the input, so typing works
      // without clicking into it first
      const active = document.activeElement
      const isEditableElsewhere =
        active instanceof HTMLElement &&
        active !== inputRef.current &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
      if (isEditableElsewhere) return

      if (/^[a-zA-Z0-9]$/.test(event.key) && document.activeElement !== inputRef.current) {
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [restartHandler])

  const elapsed = state.duration - state.timer
  const liveWpm = elapsed > 0 ? (state.correctKeystroke * 12) / elapsed : 0
  const botLiveWpm = elapsed > 0 ? (bot.state.correctKeystroke * 12) / elapsed : 0

  return (
    <>
      <TypingHands keystrokeRef={keystrokeRef} gameOver={isGameOver} />

      {!isGameOver ? (
        <div className="max-w-3xl mx-auto mt-10 md:mt-14">
          <div className="flex flex-col items-center gap-2 mb-6">
            <DurationSelector active={duration} disabled={hasStarted} onChange={changeDuration} />
            <DifficultySelector active={difficulty} disabled={hasStarted} onChange={changeDifficulty} />
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

          <div className="mt-6 pt-4 border-t border-solid border-edge">
            <p className="text-xs text-muted mb-1">
              Bot ({difficulty}) — {Math.round(botLiveWpm)} WPM
            </p>
            <WordContainer
              words={bot.state.words}
              typedInput={bot.state.wordInput}
              wpm={botLiveWpm}
              wrongKeystroke={bot.state.wrongKeystroke}
              onFocusRequest={() => {}}
              compact
            />
          </div>
        </div>
      ) : (
        <div className="mt-10">
          <div className="text-center mb-8">
            <p className={`text-3xl font-bold ${outcome ? OUTCOME_CLASS[outcome] : ''}`}>{outcome && OUTCOME_LABEL[outcome]}</p>
            <p className="text-muted text-sm mt-1">
              You: {playerWpm} WPM &middot; Bot ({difficulty}): {botWpm} WPM
            </p>
          </div>
          <Result state={state} session={session} displayName={displayName} xpGain={xpGain} />
          <div className="flex justify-center items-center gap-2 mt-8">
            <span className="text-[10px] text-muted border border-solid border-edge rounded px-1 py-0.5">Tab</span>
            <RestartButton onClick={restartHandler} />
          </div>
        </div>
      )}

      <AchievementToast achievement={newAchievement} onDismiss={dismissAchievement} />
    </>
  )
}
