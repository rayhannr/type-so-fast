'use client'

import { useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react'
import { ChangeEvent, InputEvent, KeyboardEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { generateWords } from '@/lib/word-generators'
import { WordMode } from '@/lib/word-generators'

import { WordContainer } from './WordContainer'
import { Input } from './Input'
import { Result } from './Result'
import { Timer } from './Timer'
import { RestartButton } from './RestartButton'
import { AchievementToast } from './AchievementToast'
import { TypingHands } from './TypingHands'
import { Keystroke } from './TypingHands'
import { DurationSelector } from './DurationSelector'
import { Duration } from './DurationSelector'
import { ModeSelector } from './ModeSelector'

import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'
import { useGameEndSync } from '@/hooks/useGameEndSync'
import { useRemotePlayer } from '@/hooks/useRemotePlayer'
import { playKeyClick, playErrorBuzz, playWordChime } from '@/lib/sounds'
import { gameReducer, createInitialState } from '@/lib/gameReducer'
import { useCreateMatchTicketMutation, useMatchTicketStatusQuery, useCancelMatchTicketMutation } from '@/lib/queries/matchmaking'
import { useSessionQuery, useSetSessionAttributesMutation, useLeaveSessionMutation } from '@/lib/queries/session'

const numberOfWords = 400

type Outcome = 'win' | 'lose' | 'tie'
type Phase = 'idle' | 'queueing' | 'connecting' | 'countdown' | 'racing'

const OUTCOME_LABEL: Record<Outcome, string> = { win: 'You Win!', lose: 'Opponent Wins', tie: "It's a Tie" }
const OUTCOME_CLASS: Record<Outcome, string> = { win: 'text-correct', lose: 'text-error', tie: 'text-active' }

export const PvpGame = () => {
  const { session, displayName } = useAgsSessionContext()

  // a match-invite accept lands here via `/pvp?session=<id>` — the session already has both
  // players named in its roster (see lib/ags/session.ts's createInviteSession), so this joins
  // it directly instead of going through Quick Match's idle/queueing ticket flow.
  const joinSessionId = useSearchParams().get('session')

  const [duration, setDuration] = useState<Duration>(60)
  const [mode, setMode] = useState<WordMode>('words')
  const [phase, setPhase] = useState<Phase>(joinSessionId ? 'connecting' : 'idle')
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState(joinSessionId ?? '')
  const [timedOut, setTimedOut] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [capsLockOn, setCapsLockOn] = useState(false)

  const [state, dispatch] = useReducer(gameReducer, [], () => createInitialState([]))
  const createTicket = useCreateMatchTicketMutation(session)
  const cancelTicket = useCancelMatchTicketMutation(session)
  const ticketStatus = useMatchTicketStatusQuery(session, phase === 'queueing' ? ticketId : null)
  const pvpSession = useSessionQuery(session, sessionId)
  const setSessionAttributes = useSetSessionAttributesMutation(session)
  const leaveSession = useLeaveSessionMutation(session)

  const attributes = pvpSession.data?.attributes

  const peerUserId = useMemo(
    () => pvpSession.data?.members.find((m) => m.userID !== session?.userId)?.userID ?? null,
    [pvpSession.data, session?.userId]
  )
  const isAuthority = useMemo(() => {
    if (!pvpSession.data || !session) return false
    const ids = pvpSession.data.members.map((m) => m.userID).sort()
    return ids[0] === session.userId
  }, [pvpSession.data, session])

  const isGameOver = state.timer === 0
  const remote = useRemotePlayer({
    isOfferer: isAuthority,
    active: phase === 'connecting' || phase === 'countdown' || phase === 'racing',
    offer: attributes?.offer,
    answer: attributes?.answer,
    onOffer: (offer) => setSessionAttributes.mutate({ sessionId, attributes: { offer } }),
    onAnswer: (answer) => setSessionAttributes.mutate({ sessionId, attributes: { answer } }),
  })

  const playerWpm = Math.round((state.correctKeystroke * 12) / state.duration)
  const remoteWpm = Math.round(((remote.remote?.correctKeystroke ?? 0) * 12) / state.duration)

  let outcome: Outcome | null = null
  if (isGameOver) {
    if (playerWpm === remoteWpm) outcome = 'tie'
    else outcome = playerWpm > remoteWpm ? 'win' : 'lose'
  }

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
    pvp: isGameOver ? { outcome: outcome! } : undefined,
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const keystrokeRef = useRef<Keystroke>({ id: 0, char: '' })

  // authority generates the shared word list once both players are in the session and seeds
  // its own reducer immediately — deliberately not routed through the polled attributes cache,
  // since that poll races with this mutation's own cache write and can clobber it right before
  // the WebRTC handshake (independent of this poll) flips the game into 'racing' with no words.
  // The other player has no such race: it only ever reads the words via poll, never writes them.
  const hasSeededWordsRef = useRef(false)
  useEffect(() => {
    if (phase !== 'connecting' || !pvpSession.data || !isAuthority || attributes?.words || hasSeededWordsRef.current) return
    hasSeededWordsRef.current = true
    const words = generateWords(mode, numberOfWords)
    dispatch({ type: 'RESTART', words, duration })
    setSessionAttributes.mutate({
      sessionId,
      attributes: { mode, duration, words, authorityUserId: session!.userId },
    })
  }, [phase, pvpSession.data, isAuthority, attributes?.words])

  // non-authority: seed the local reducer once the authority's word list lands via poll
  useEffect(() => {
    if (phase !== 'connecting' || isAuthority || !attributes?.words || !peerUserId) return
    dispatch({ type: 'RESTART', words: attributes.words, duration: attributes.duration! })
  }, [phase, isAuthority, attributes?.words, peerUserId])

  useEffect(() => {
    if (phase === 'connecting' && remote.connected) setPhase('countdown')
  }, [phase, remote.connected])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown === 0) {
      setPhase('racing')
      inputRef.current?.focus()
      return
    }
    const timeout = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timeout)
  }, [phase, countdown])

  useEffect(() => {
    if (phase !== 'racing') return
    let timesLeft = state.timer
    intervalRef.current = setInterval(() => {
      timesLeft -= 1
      dispatch({ type: 'TICK' })
      if (timesLeft <= 0) clearInterval(intervalRef.current!)
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [phase])

  // broadcast our own progress on every change so the opponent's compact panel stays live
  useEffect(() => {
    if (phase !== 'racing') return
    remote.sendSnapshot({
      words: state.words,
      wordInput: state.wordInput,
      correctKeystroke: state.correctKeystroke,
      wrongKeystroke: state.wrongKeystroke,
    })
  }, [phase, state.words, state.wordInput, state.correctKeystroke, state.wrongKeystroke])

  const startQuickMatch = () => {
    setTimedOut(false)
    setPhase('queueing')
    createTicket.mutate(undefined, {
      onSuccess: (ticket) => setTicketId(ticket.matchTicketID),
      onError: () => setPhase('idle'),
    })
  }

  const cancelQuickMatch = () => {
    if (ticketId) cancelTicket.mutate(ticketId)
    setTicketId(null)
    setPhase('idle')
  }

  useEffect(() => {
    if (phase !== 'queueing' || !ticketStatus.data) return
    if (ticketStatus.data.matchFound && ticketStatus.data.sessionID) {
      setSessionId(ticketStatus.data.sessionID)
      setPhase('connecting')
      return
    }
    if (ticketStatus.data.isActive === false) {
      setTicketId(null)
      setTimedOut(true)
      setPhase('idle')
    }
  }, [phase, ticketStatus.data])

  const restartHandler = useCallback(() => {
    if (sessionId) leaveSession.mutate(sessionId)
    clearInterval(intervalRef.current!)
    setPhase('idle')
    setSessionId('')
    setTicketId(null)
    setCountdown(3)
    dispatch({ type: 'RESTART', words: [], duration })
  }, [duration, sessionId])

  const changeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    const currentWord = state.words[0]
    if (value.endsWith(' ') && value.slice(0, -1) === currentWord) playWordChime()
    dispatch({ type: 'INPUT_CHANGE', value, currentWord })
  }

  const inputHandler = (event: InputEvent<HTMLInputElement>) => {
    const currentWord = state.words[0]
    const currentKey = event.nativeEvent.data
    if (currentKey?.length === 1) {
      keystrokeRef.current = { id: keystrokeRef.current.id + 1, char: currentKey }
      if (currentKey !== ' ') {
        if (state.isInputCorrect) playKeyClick()
        else playErrorBuzz()
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

  const elapsed = state.duration - state.timer
  const liveWpm = elapsed > 0 ? (state.correctKeystroke * 12) / elapsed : 0
  const remoteLiveWpm = elapsed > 0 ? ((remote.remote?.correctKeystroke ?? 0) * 12) / elapsed : 0

  if (phase === 'idle') {
    return (
      <div className="max-w-3xl mx-auto mt-10 md:mt-14 text-center">
        <div className="flex flex-col items-center gap-2 mb-8">
          <DurationSelector active={duration} disabled={false} onChange={setDuration} />
          <ModeSelector active={mode} disabled={false} onChange={setMode} />
        </div>
        {timedOut && <p className="text-error text-sm mb-4">No opponent found within 60s. Try again?</p>}
        <button
          type="button"
          onClick={startQuickMatch}
          className="px-6 py-2.5 rounded-md bg-accent text-black font-semibold cursor-pointer hover:opacity-90 transition-opacity"
        >
          Quick Match
        </button>
      </div>
    )
  }

  if (phase === 'queueing') {
    return (
      <div className="max-w-3xl mx-auto mt-14 text-center">
        <p className="text-active text-lg mb-2">Searching for an opponent&hellip;</p>
        <p className="text-muted text-xs mb-6">Cancels automatically after 60s if no one joins</p>
        <button
          type="button"
          onClick={cancelQuickMatch}
          className="px-4 py-1.5 text-sm rounded-md border border-solid border-edge text-muted hover:text-active cursor-pointer"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (phase === 'connecting') {
    return (
      <div className="max-w-3xl mx-auto mt-14 text-center">
        <p className="text-active text-lg">Opponent found — connecting&hellip;</p>
      </div>
    )
  }

  if (phase === 'countdown') {
    return (
      <div className="max-w-3xl mx-auto mt-14 text-center">
        <p className="text-6xl font-bold text-accent">{countdown}</p>
      </div>
    )
  }

  return (
    <>
      <TypingHands keystrokeRef={keystrokeRef} gameOver={isGameOver} />

      {!isGameOver ? (
        <div className="max-w-3xl mx-auto mt-10 md:mt-14">
          <div className="flex flex-row items-center justify-between mb-4">
            <Timer timer={state.timer} />
            {capsLockOn && <span className="text-xs text-error">Caps Lock is on</span>}
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
            <p className="text-xs text-muted mb-1">Opponent — {Math.round(remoteLiveWpm)} WPM</p>
            {remote.remote ? (
              <WordContainer
                words={remote.remote.words}
                typedInput={remote.remote.wordInput}
                wpm={remoteLiveWpm}
                wrongKeystroke={remote.remote.wrongKeystroke}
                onFocusRequest={() => { }}
                compact
              />
            ) : (
              <p className="text-muted text-xs">Waiting for opponent&apos;s first keystroke&hellip;</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-10">
          <div className="text-center mb-8">
            <p className={`text-3xl font-bold ${outcome ? OUTCOME_CLASS[outcome] : ''}`}>{outcome && OUTCOME_LABEL[outcome]}</p>
            <p className="text-muted text-sm mt-1">
              You: {playerWpm} WPM &middot; Opponent: {remoteWpm} WPM
            </p>
          </div>
          <Result state={state} session={session} displayName={displayName} xpGain={xpGain} />
          <div className="flex justify-center items-center gap-2 mt-8">
            <RestartButton onClick={restartHandler} />
          </div>
        </div>
      )}

      <AchievementToast achievement={newAchievement} onDismiss={dismissAchievement} />
    </>
  )
}
