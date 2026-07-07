'use client'

import { useEffect, useReducer, useState, useMemo, useRef, useCallback } from 'react'
import type { ChangeEvent, InputEvent, KeyboardEvent } from 'react'
import { generateWords } from '@/lib/word-generators'
import type { WordMode } from '@/lib/word-generators'

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
import { ModeSelector } from './ModeSelector'

import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'
import { useGameEndSync } from '@/lib/useGameEndSync'
import { playKeyClick, playErrorBuzz, playWordChime } from '@/lib/sounds'
import { gameReducer, createInitialState } from '@/lib/gameReducer'

const numberOfWords = 400

export const SoloGame = () => {
  const [state, dispatch] = useReducer(gameReducer, [], () => createInitialState([]))
  const [duration, setDuration] = useState<Duration>(60)
  const [mode, setMode] = useState<WordMode>('words')
  const [hasStarted, setHasStarted] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)

  const { session, displayName } = useAgsSessionContext()

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
    inputRef.current?.focus()
  }, [])

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

      {!isGameOver ? (
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
      )}

      <AchievementToast achievement={newAchievement} onDismiss={dismissAchievement} />
    </>
  )
}
