'use client'

import { useEffect, useReducer, useState, useRef, useCallback } from 'react'
import { Language } from '@/constants/words'
import { generateWords, WordMode } from '@/lib/word-generators'

import { AchievementToast } from './AchievementToast'
import { DurationSelector, Duration } from './DurationSelector'
import { Input } from './Input'
import { LanguageSelector } from './LanguageSelector'
import { ModeSelector } from './ModeSelector'
import { RestartButton } from './RestartButton'
import { Result } from './Result'
import { Timer } from './Timer'
import { TypingHands } from './TypingHands'
import { WordContainer } from './WordContainer'

import { useGameEndSync } from '@/hooks/useGameEndSync'
import { useTabRestart } from '@/hooks/useTabRestart'
import { useTypingInput } from '@/hooks/useTypingInput'
import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'
import { gameReducer, createInitialState } from '@/lib/gameReducer'

const numberOfWords = 400

export const SoloGame = () => {
  const [state, dispatch] = useReducer(gameReducer, [], () => createInitialState([]))
  const [duration, setDuration] = useState<Duration>(60)
  const [mode, setMode] = useState<WordMode>('words')
  const [language, setLanguage] = useState<Language>('indonesian')
  const [hasStarted, setHasStarted] = useState(false)

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
    displayName
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasStartedRef = useRef<boolean>(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // words are generated client-side only (random), so the initial fill happens in an effect
  useEffect(() => {
    dispatch({ type: 'RESTART', words: generateWords('words', numberOfWords, language), duration: 60 })
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const onFirstKeystroke = () => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    setHasStarted(true)
    let timesLeft: number = state.timer
    intervalRef.current = setInterval(() => {
      timesLeft -= 1
      dispatch({ type: 'TICK' })

      if (timesLeft <= 0) {
        clearInterval(intervalRef.current!)
      }
    }, 1000)
  }

  const { keystrokeRef, capsLockOn, changeHandler, inputHandler, keyDownHandler } = useTypingInput(state, dispatch, onFirstKeystroke)

  const restartHandler = useCallback(() => {
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
    setHasStarted(false)
    dispatch({ type: 'RESTART', words: generateWords(mode, numberOfWords, language), duration })
    inputRef.current?.focus()
  }, [mode, duration, language])

  const changeDuration = (nextDuration: Duration) => {
    if (hasStarted) return
    setDuration(nextDuration)
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
    dispatch({ type: 'RESTART', words: generateWords(mode, numberOfWords, language), duration: nextDuration })
  }

  const changeMode = (nextMode: WordMode) => {
    if (hasStarted) return
    setMode(nextMode)
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
    dispatch({ type: 'RESTART', words: generateWords(nextMode, numberOfWords, language), duration })
  }

  const changeLanguage = (nextLanguage: Language) => {
    if (hasStarted) return
    setLanguage(nextLanguage)
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
    dispatch({ type: 'RESTART', words: generateWords(mode, numberOfWords, nextLanguage), duration })
  }

  useTabRestart(restartHandler, inputRef)

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
            <LanguageSelector active={language} disabled={hasStarted} onChange={changeLanguage} />
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
