'use client'

import { useEffect, useMemo, useReducer, useRef, useState, useCallback, FormEvent } from 'react'
import { generateWords, WordMode } from '@/lib/word-generators'

import { WordContainer } from './WordContainer'
import { Input } from './Input'
import { Result } from './Result'
import { Timer } from './Timer'
import { RestartButton } from './RestartButton'
import { AchievementToast } from './AchievementToast'
import { TypingHands } from './TypingHands'
import { DurationSelector, Duration } from './DurationSelector'
import { ModeSelector } from './ModeSelector'

import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'
import { useGameEndSync } from '@/hooks/useGameEndSync'
import { useRoomChannel } from '@/hooks/useRoomChannel'
import { useTypingInput } from '@/hooks/useTypingInput'
import { gameReducer, createInitialState } from '@/lib/gameReducer'
import {
  useCreateRoomMutation,
  useJoinRoomMutation,
  useStartRoomMutation,
  useRoomQuery,
  useSetRoomAttributesMutation,
  joinRoomErrorMessage,
} from '@/lib/queries/rooms'

const numberOfWords = 400

type Phase = 'entry' | 'lobby' | 'racing'

export const RoomGame = () => {
  const { session, displayName } = useAgsSessionContext()

  const [duration, setDuration] = useState<Duration>(60)
  const [mode, setMode] = useState<WordMode>('words')
  const [phase, setPhase] = useState<Phase>('entry')
  const [sessionId, setSessionId] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)

  const [state, dispatch] = useReducer(gameReducer, [], () => createInitialState([]))
  const createRoom = useCreateRoomMutation(session)
  const joinRoom = useJoinRoomMutation(session)
  const startRoom = useStartRoomMutation(session)
  const room = useRoomQuery(session, sessionId || null)
  const setRoomAttributes = useSetRoomAttributesMutation(session)
  const roomChannel = useRoomChannel(session, sessionId || null)

  const isHost = useMemo(() => !!session && room.data?.leaderId === session.userId, [session, room.data])
  const attributes = room.data?.attributes
  const isGameOver = state.timer === 0

  // roster combines the room's own member list (covers players already joined before this
  // client subscribed) with live room:joined events from Pusher (covers joins after)
  const rosterIds = useMemo(() => {
    const ids = new Set(roomChannel.roster)
    for (const m of room.data?.members ?? []) ids.add(m.userID)
    return ids
  }, [roomChannel.roster, room.data])

  const opponentIds = useMemo(() => [...rosterIds].filter((id) => id !== session?.userId), [rosterIds, session?.userId])

  // memberNames only covers whoever was in the room as of the last poll — a player who joined via
  // Pusher's room:joined between polls has no resolved name yet, so fall back to a truncated id
  // (same fallback shape getUserSummaries itself uses when IAM has no displayName).
  const nameFor = useCallback(
    (userId: string) => room.data?.memberNames.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 8),
    [room.data?.memberNames]
  )

  const playerWpm = Math.round((state.correctKeystroke * 12) / state.duration)
  const maxOpponentWpm = Math.max(0, ...opponentIds.map((id) => roomChannel.opponents[id]?.wpm ?? 0))
  // heuristic, not authoritative: everyone shares the same duration/word list and finishes at the
  // same tick, but opponent WPM here comes from throttled Pusher updates (~500ms lag), not a
  // server-verified tally — good enough for an achievement gate, not for a leaderboard.
  const won = opponentIds.length > 0 && playerWpm >= maxOpponentWpm

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
    room: isGameOver ? { won, fullHouse: rosterIds.size >= 5 } : undefined,
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const raceStartRef = useRef<number | null>(null)

  // one-time seed guard: host seeds on start, joiners via room:start (or the attributes poll)
  const hasSeededWordsRef = useRef(false)
  // /start's room:start broadcast is the shared start moment, so it must fire before the
  // attributes carry status 'racing' — otherwise a joiner's poll can start them early. The two
  // writes are also sequenced (not concurrent) to avoid racing on the session's version.
  const handleStart = async () => {
    if (!isHost || !sessionId) return
    hasSeededWordsRef.current = true
    const words = generateWords(mode, numberOfWords)
    dispatch({ type: 'RESTART', words, duration })
    try {
      await startRoom.mutateAsync({ sessionId, words, duration, mode })
    } catch {
      // surfaced via startRoom.isError — nothing started, so the host can retry
      return
    }
    // fallback record for clients that missed the broadcast and start via the attributes poll
    setRoomAttributes.mutate({ sessionId, attributes: { mode, duration, words, status: 'racing' } })
  }

  // joiners seed from the room:start broadcast — same event that starts the race, so the words
  // can never lag behind the start the way the 2s attributes poll can
  useEffect(() => {
    const setup = roomChannel.raceSetup
    if (isHost || hasSeededWordsRef.current || !setup) return
    hasSeededWordsRef.current = true
    setDuration(setup.duration as Duration)
    setMode(setup.mode)
    dispatch({ type: 'RESTART', words: setup.words, duration: setup.duration })
  }, [isHost, roomChannel.raceSetup])

  // fallback: seed from the attributes poll if the broadcast was missed
  useEffect(() => {
    if (isHost || hasSeededWordsRef.current || !attributes?.words) return
    hasSeededWordsRef.current = true
    setDuration(attributes.duration! as Duration)
    setMode(attributes.mode as WordMode)
    dispatch({ type: 'RESTART', words: attributes.words, duration: attributes.duration! })
  }, [isHost, attributes?.words])

  // the host waits for its own room:start broadcast too — flipping on the local attribute
  // write would start its clock ahead of every joiner's
  useEffect(() => {
    if (phase === 'lobby' && ((attributes?.status === 'racing' && !isHost) || roomChannel.phase === 'racing')) {
      setPhase('racing')
      inputRef.current?.focus()
    }
  }, [phase, attributes?.status, roomChannel.phase, isHost])

  useEffect(() => {
    if (phase !== 'racing') return
    raceStartRef.current = Date.now()
    let timesLeft = state.timer
    intervalRef.current = setInterval(() => {
      timesLeft -= 1
      dispatch({ type: 'TICK' })
      if (timesLeft <= 0) clearInterval(intervalRef.current!)
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [phase])

  // wall-clock, not the once-a-second timer tick — a tick-based denominator spikes the wpm
  // broadcast when keystrokes land right after a tick
  const wallElapsed = raceStartRef.current ? (Date.now() - raceStartRef.current) / 1000 : 0
  const liveWpm = wallElapsed > 0 ? (state.correctKeystroke * 12) / wallElapsed : 0
  const progressPct = state.words.length > 0 ? Math.min(100, (state.correctWords / (wallElapsed * 0.8 + 1)) * 10) : 0

  // broadcast our own progress at a throttled rate so opponents' panels stay live
  useEffect(() => {
    if (phase !== 'racing') return
    roomChannel.publishProgress(Math.round(liveWpm), progressPct)
  }, [phase, state.correctKeystroke, state.wrongKeystroke])

  const handleCreateRoom = () => {
    setJoinError(null)
    createRoom.mutate(undefined, {
      onSuccess: (created) => {
        setSessionId(created.id)
        setPhase('lobby')
      },
    })
  }

  const handleJoinRoom = (event: FormEvent) => {
    event.preventDefault()
    const code = codeInput.trim().toUpperCase()
    if (!code) return
    setJoinError(null)
    joinRoom.mutate(code, {
      onSuccess: (joined) => {
        setSessionId(joined.id)
        setPhase('lobby')
      },
      onError: (error) => setJoinError(joinRoomErrorMessage(error)),
    })
  }

  const restartHandler = useCallback(() => {
    clearInterval(intervalRef.current!)
    setPhase('entry')
    setSessionId('')
    setCodeInput('')
    hasSeededWordsRef.current = false
    dispatch({ type: 'RESTART', words: [], duration })
  }, [duration])

  const { keystrokeRef, capsLockOn, changeHandler, inputHandler, keyDownHandler } = useTypingInput(state, dispatch)

  if (phase === 'entry') {
    return (
      <div className="max-w-3xl mx-auto mt-10 md:mt-14 text-center">
        <div className="flex flex-col items-center gap-2 mb-8">
          <DurationSelector active={duration} disabled={false} onChange={setDuration} />
          <ModeSelector active={mode} disabled={false} onChange={setMode} />
        </div>
        <div className="flex flex-col items-center gap-6">
          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={createRoom.isPending}
            className="px-6 py-2.5 rounded-md bg-accent text-black font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createRoom.isPending ? 'Creating…' : 'Create Room'}
          </button>
          <form onSubmit={handleJoinRoom} className="flex flex-row gap-2">
            <input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
              placeholder="Enter room code"
              aria-label="Room code"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={6}
              className="min-w-0 rounded-lg border border-solid border-edge bg-surface px-4 py-2.5 text-sm text-active tracking-widest placeholder:tracking-normal placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={joinRoom.isPending || !codeInput.trim()}
              className="shrink-0 rounded-lg border border-solid border-edge bg-surface px-4 text-sm text-accent transition-colors cursor-pointer hover:border-accent disabled:cursor-default disabled:text-muted"
            >
              {joinRoom.isPending ? 'Joining…' : 'Join'}
            </button>
          </form>
          {joinError && <p className="text-error text-xs">{joinError}</p>}
        </div>
      </div>
    )
  }

  if (phase === 'lobby') {
    return (
      <div className="max-w-3xl mx-auto mt-10 md:mt-14 text-center">
        <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Room code</p>
        <p className="text-4xl font-bold text-accent tracking-[0.3em] mb-6">{room.data?.code ?? '······'}</p>
        <p className="text-active text-sm mb-2">
          {rosterIds.size} / 5 players joined
        </p>
        <ul className="text-muted text-xs mb-8">
          {[...rosterIds].map((id) => (
            <li key={id}>{id === session?.userId ? `${displayName ?? 'You'} (you)` : nameFor(id)}</li>
          ))}
        </ul>
        {isHost ? (
          <>
            <button
              type="button"
              onClick={handleStart}
              disabled={setRoomAttributes.isPending || startRoom.isPending}
              className="px-6 py-2.5 rounded-md bg-accent text-black font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {setRoomAttributes.isPending || startRoom.isPending ? 'Starting…' : 'Start Match'}
            </button>
            {(setRoomAttributes.isError || startRoom.isError) && (
              <p className="text-error text-xs mt-2">Couldn&apos;t start the match — try again.</p>
            )}
          </>
        ) : (
          <p className="text-muted text-sm">Waiting for the host to start&hellip;</p>
        )}
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

          {opponentIds.length > 0 && (
            <div className="mt-6 pt-4 border-t border-solid border-edge flex flex-col gap-2">
              <p className="text-xs text-muted mb-1">Opponents</p>
              {opponentIds.map((id) => {
                const opponent = roomChannel.opponents[id]
                return (
                  <div key={id} className="flex flex-row items-center gap-3 text-xs">
                    <span className="text-muted w-24 truncate">{nameFor(id)}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${Math.min(100, opponent?.progress ?? 0)}%` }}
                      />
                    </div>
                    <span className="text-active w-16 text-right tabular-nums">{opponent?.wpm ?? 0} wpm</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-10">
          {opponentIds.length > 0 && (
            <div className="text-center mb-8">
              <p className={`text-3xl font-bold ${won ? 'text-correct' : 'text-active'}`}>
                {won ? 'You Win!' : 'Better luck next time'}
              </p>
              <p className="text-muted text-sm mt-1">
                You: {playerWpm} WPM &middot; Best opponent: {maxOpponentWpm} WPM
              </p>
            </div>
          )}
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
