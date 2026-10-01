'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react'
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
import { useRemotePlayer } from '@/hooks/useRemotePlayer'
import { useTypingInput } from '@/hooks/useTypingInput'
import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'
import { PvpSessionAttributes } from '@/lib/ags/session'
import { gameReducer, createInitialState } from '@/lib/gameReducer'
import { DEFAULT_PVP_SETTINGS, describePvpSettings, PvpSettings, readPvpSettings, writePvpSettings } from '@/lib/pvpSettings'
import { useCreateMatchTicketMutation, useMatchTicketStatusQuery, useCancelMatchTicketMutation } from '@/lib/queries/matchmaking'
import {
  pvpSessionErrorMessage,
  useSessionQuery,
  useSetSessionAttributesMutation,
  useJoinSessionMutation,
  useLeaveSessionMutation
} from '@/lib/queries/session'
import { useTurnServersQuery } from '@/lib/queries/turn'

const numberOfWords = 400

// backstop for a handshake that stalls without any request or connection reporting an error
const CONNECT_TIMEOUT_MS = 20_000

type Outcome = 'win' | 'lose' | 'tie'
type Phase = 'idle' | 'queueing' | 'connecting' | 'countdown' | 'racing'

const OUTCOME_LABEL: Record<Outcome, string> = { win: 'You Win!', lose: 'Opponent Wins', tie: "It's a Tie" }
const OUTCOME_CLASS: Record<Outcome, string> = { win: 'text-correct', lose: 'text-error', tie: 'text-active' }

// the WebRTC handshake happens during 'connecting' — poll tighter there so offer/answer/ICE
// candidates propagate faster. Nothing in `attributes` changes once the race has actually started
// (words/offer/answer are already resolved by then, and progress rides the data channel, not this
// poll), so 'countdown'/'racing' disable polling entirely instead of continuing to hit AGS every
// 1.5s through to the results screen.
const POLL_INTERVAL_MS_BY_PHASE: Record<Phase, number | false> = {
  idle: 1500,
  queueing: 1500,
  connecting: 400,
  countdown: false,
  racing: false
}

// An invite session carries the inviter's settings from creation, while a matchmade one starts
// empty; either way the authority's write fills all three in alongside the words.
const sessionSettings = (attributes: Partial<PvpSessionAttributes> | undefined): PvpSettings | null => {
  if (!attributes?.mode || !attributes.duration || !attributes.language) return null
  return { mode: attributes.mode as WordMode, duration: attributes.duration, language: attributes.language as Language }
}

export const PvpGame = () => {
  const { session, displayName } = useAgsSessionContext()
  const router = useRouter()

  // a match-invite accept lands here via `/pvp?session=<id>` — the session already has both
  // players named in its roster (see lib/ags/session.ts's createInviteSession), so this joins
  // it directly instead of going through Quick Match's idle/queueing ticket flow.
  const joinSessionId = useSearchParams().get('session')

  // `settings` is this player's own preference; `race` is what the current match is played with,
  // which for an invite is the inviter's choice rather than this player's
  const [settings, setSettings] = useState<PvpSettings>(DEFAULT_PVP_SETTINGS)
  const [race, setRace] = useState<PvpSettings | null>(null)
  const raceSettings = race ?? settings

  // read after mount so the server render and the first client render agree
  useEffect(() => setSettings(readPvpSettings()), [])

  // only an explicit pick is saved, so racing with an inviter's settings never overwrites this
  // player's own preference
  const changeSettings = (patch: Partial<PvpSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    writePvpSettings(next)
  }
  const [phase, setPhase] = useState<Phase>(joinSessionId ? 'connecting' : 'idle')
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState(joinSessionId ?? '')
  const [timedOut, setTimedOut] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const [countdown, setCountdown] = useState(3)

  const [state, dispatch] = useReducer(gameReducer, [], () => createInitialState([]))
  const createTicket = useCreateMatchTicketMutation(session)
  const cancelTicket = useCancelMatchTicketMutation(session)
  const ticketStatus = useMatchTicketStatusQuery(session, phase === 'queueing' ? ticketId : null)
  // the WebRTC handshake happens during 'connecting' — poll tighter there so offer/answer/ICE
  // candidates propagate faster. Nothing in `attributes` changes once the race has actually
  // started (words/offer/answer are already resolved by then, and progress rides the data
  // channel, not this poll), so stop polling entirely for 'countdown'/'racing' instead of
  // continuing to hit AGS every 1.5s through to the results screen.
  const pvpSession = useSessionQuery(session, sessionId, POLL_INTERVAL_MS_BY_PHASE[phase])
  const setSessionAttributes = useSetSessionAttributesMutation(session)
  const joinSession = useJoinSessionMutation(session)
  const leaveSession = useLeaveSessionMutation(session)
  const turnServers = useTurnServersQuery(session, sessionId)

  const attributes = pvpSession.data?.attributes

  // the inviter of a direct match stays INVITED until it joins, and AGS rejects an INVITED
  // member's attribute writes, so nothing is written to the session before this flips
  const myStatus = pvpSession.data?.members.find(m => m.userID === session?.userId)?.status
  const joined = !!myStatus && myStatus !== 'INVITED'
  useEffect(() => {
    if (myStatus === 'INVITED' && joinSession.isIdle) {
      joinSession.mutate(sessionId, { onError: error => failConnecting(pvpSessionErrorMessage(error)) })
    }
  }, [myStatus])

  const peerUserId = useMemo(
    () => pvpSession.data?.members.find(m => m.userID !== session?.userId)?.userID ?? null,
    [pvpSession.data, session?.userId]
  )
  const isAuthority = useMemo(() => {
    if (!pvpSession.data || !session) return false
    const ids = pvpSession.data.members.map(m => m.userID).sort()
    return ids[0] === session.userId
  }, [pvpSession.data, session])

  const isGameOver = state.timer === 0
  const remote = useRemotePlayer({
    isOfferer: isAuthority,
    // wait for the TURN lookup to settle either way, since the peer connection's ICE servers are
    // fixed at creation
    active: (phase === 'connecting' && joined && turnServers.isFetched) || phase === 'countdown' || phase === 'racing',
    turnServers: turnServers.data ?? [],
    offer: attributes?.offer,
    answer: attributes?.answer,
    onOffer: offer => writeSessionAttributes({ offer }),
    onAnswer: answer => writeSessionAttributes({ answer })
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
    duration: raceSettings.duration as Duration,
    mode: raceSettings.mode,
    session,
    displayName,
    pvp: isGameOver ? { outcome: outcome! } : undefined
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // authority generates the shared word list once both players are in the session and seeds
  // its own reducer immediately — deliberately not routed through the polled attributes cache,
  // since that poll races with this mutation's own cache write and can clobber it right before
  // the WebRTC handshake (independent of this poll) flips the game into 'racing' with no words.
  // The other player has no such race: it only ever reads the words via poll, never writes them.
  const hasSeededWordsRef = useRef(false)
  useEffect(() => {
    if (phase !== 'connecting' || !joined || !isAuthority || attributes?.words || hasSeededWordsRef.current) return
    hasSeededWordsRef.current = true
    const next = sessionSettings(attributes) ?? settings
    setRace(next)
    const words = generateWords(next.mode, numberOfWords, next.language)
    dispatch({ type: 'RESTART', words, duration: next.duration })
    writeSessionAttributes({ ...next, words, authorityUserId: session!.userId })
  }, [phase, joined, isAuthority, attributes?.words])

  // non-authority: seed the local reducer once the authority's word list lands via poll
  useEffect(() => {
    if (phase !== 'connecting' || isAuthority || !attributes?.words || !peerUserId) return
    setRace(sessionSettings(attributes))
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
    const timeout = setTimeout(() => setCountdown(c => c - 1), 1000)
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
      wrongKeystroke: state.wrongKeystroke
    })
  }, [phase, state.words, state.wordInput, state.correctKeystroke, state.wrongKeystroke])

  const startQuickMatch = () => {
    setTimedOut(false)
    setConnectError(null)
    setPhase('queueing')
    createTicket.mutate(settings, {
      onSuccess: ticket => setTicketId(ticket.matchTicketID),
      onError: () => setPhase('idle')
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

  const resetMatch = useCallback(() => {
    if (sessionId) leaveSession.mutate(sessionId)
    clearInterval(intervalRef.current!)
    setPhase('idle')
    setSessionId('')
    setTicketId(null)
    setCountdown(3)
    setRace(null)
    hasSeededWordsRef.current = false
    joinSession.reset()
    dispatch({ type: 'RESTART', words: [], duration: settings.duration })
  }, [settings.duration, sessionId])

  // clearing `?session=` keeps a reload from dropping straight back into a match that's over
  const restartHandler = useCallback(() => {
    resetMatch()
    if (joinSessionId) router.replace('/pvp')
  }, [resetMatch, joinSessionId])

  // accepting an invite while already on /pvp only changes the search param, which doesn't
  // remount this component, so switch to the new match here
  const handledJoinSessionIdRef = useRef(joinSessionId)
  useEffect(() => {
    if (!joinSessionId || joinSessionId === handledJoinSessionIdRef.current) return
    handledJoinSessionIdRef.current = joinSessionId
    if (ticketId) cancelTicket.mutate(ticketId)
    resetMatch()
    setTimedOut(false)
    setConnectError(null)
    setSessionId(joinSessionId)
    setPhase('connecting')
  }, [joinSessionId])

  // back to the Quick Match screen with the reason shown there; only a match still connecting can
  // fail this way, so a late error from an abandoned match is ignored
  const failConnecting = (message: string) => {
    if (phaseRef.current !== 'connecting') return
    restartHandler()
    setConnectError(message)
  }

  const writeSessionAttributes = (attributes: Partial<PvpSessionAttributes>) =>
    setSessionAttributes.mutate({ sessionId, attributes }, { onError: error => failConnecting(pvpSessionErrorMessage(error)) })

  useEffect(() => {
    if (phase === 'connecting' && pvpSession.isError) failConnecting(pvpSessionErrorMessage(pvpSession.error))
  }, [phase, pvpSession.isError])

  useEffect(() => {
    if (phase === 'connecting' && remote.failed) failConnecting("Couldn't connect to your opponent. Try again.")
  }, [phase, remote.failed])

  useEffect(() => {
    if (phase !== 'connecting') return
    const timeout = setTimeout(() => failConnecting('Connecting to your opponent took too long. Try again.'), CONNECT_TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [phase])

  const { keystrokeRef, capsLockOn, changeHandler, inputHandler, keyDownHandler } = useTypingInput(state, dispatch)

  const elapsed = state.duration - state.timer
  const liveWpm = elapsed > 0 ? (state.correctKeystroke * 12) / elapsed : 0
  const remoteLiveWpm = elapsed > 0 ? ((remote.remote?.correctKeystroke ?? 0) * 12) / elapsed : 0

  if (phase === 'idle') {
    return (
      <div className="max-w-3xl mx-auto mt-10 md:mt-14 text-center">
        <div className="flex flex-col items-center gap-2 mb-8">
          <DurationSelector active={settings.duration as Duration} disabled={false} onChange={duration => changeSettings({ duration })} />
          <ModeSelector active={settings.mode} disabled={false} onChange={mode => changeSettings({ mode })} />
          <LanguageSelector active={settings.language} disabled={false} onChange={language => changeSettings({ language })} />
        </div>
        {timedOut && <p className="text-error text-sm mb-4">No opponent found within 60s. Try again?</p>}
        {connectError && <p className="text-error text-sm mb-4">{connectError}</p>}
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
        <p className="text-muted text-sm mb-1">{describePvpSettings(settings)}</p>
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
                onFocusRequest={() => {}}
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
