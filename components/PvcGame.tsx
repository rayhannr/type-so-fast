'use client'

import { useEffect, useReducer, useState, useRef, useCallback } from 'react'
import { Language } from '@/constants/words'
import { generateWords } from '@/lib/word-generators'

import { Difficulty } from '@/lib/botDifficulty'
import { AchievementToast } from './AchievementToast'
import { DifficultySelector } from './DifficultySelector'
import { DurationSelector, Duration } from './DurationSelector'
import { Input } from './Input'
import { LanguageSelector } from './LanguageSelector'
import { RestartButton } from './RestartButton'
import { Result } from './Result'
import { Timer } from './Timer'
import { TypingHands } from './TypingHands'
import { WordContainer } from './WordContainer'

import { useBotTypist } from '@/hooks/useBotTypist'
import { useGameEndSync } from '@/hooks/useGameEndSync'
import { useTabRestart } from '@/hooks/useTabRestart'
import { useTypingInput } from '@/hooks/useTypingInput'
import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'
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
  const [language, setLanguage] = useState<Language>('indonesian')
  const [hasStarted, setHasStarted] = useState(false)

  const { session, displayName } = useAgsSessionContext()

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
    pvc: isGameOver ? { difficulty, won: outcome === 'win' } : undefined
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasStartedRef = useRef<boolean>(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const startRound = (nextDuration: Duration, nextLanguage: Language = language) => {
    const words = generateWords('words', numberOfWords, nextLanguage)
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

  const onFirstKeystroke = () => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    setHasStarted(true)
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

  const { keystrokeRef, capsLockOn, changeHandler, inputHandler, keyDownHandler } = useTypingInput(state, dispatch, onFirstKeystroke)

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

  const changeLanguage = (nextLanguage: Language) => {
    if (hasStarted) return
    setLanguage(nextLanguage)
    clearInterval(intervalRef.current!)
    hasStartedRef.current = false
    startRound(duration, nextLanguage)
  }

  useTabRestart(restartHandler, inputRef)

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
