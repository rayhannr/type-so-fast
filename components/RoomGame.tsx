'use client'

import { useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react'
import { ChangeEvent, FormEvent, InputEvent, KeyboardEvent } from 'react'
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
import { useRoomChannel } from '@/hooks/useRoomChannel'
import { playKeyClick, playErrorBuzz, playWordChime } from '@/lib/sounds'
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
  const [capsLockOn, setCapsLockOn] = useState(false)

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
  const keystrokeRef = useRef<Keystroke>({ id: 0, char: '' })

  // host seeds the shared word list once, when starting the race — joiners pick it up via the
  // attributes read below, mirroring PvP's authority pattern (see lib/ags/session.ts)
  const hasSeededWordsRef = useRef(false)
  // sequenced, not concurrent: both write to the same AGS session via optimistic-concurrency
  // PATCH (attributes vs joinability) — firing them together races on the session's version and
  // can exhaust the single retry each write allows (see setSessionAttributes/lockRoom in
  // lib/ags/session.ts), so the words/status write must land before lockRoom starts its own.
  const handleStart = async () => {
    if (!isHost || !sessionId) return
    hasSeededWordsRef.current = true
    const words = generateWords(mode, numberOfWords)
    dispatch({ type: 'RESTART', words, duration })
    try {
      await setRoomAttributes.mutateAsync({ sessionId, attributes: { mode, duration, words, status: 'racing' } })
    } catch {
      // surfaced to the host below via setRoomAttributes.isError — bail before locking the room
      // so a failed word-list write doesn't leave joiners stuck with joins already closed
      return
    }
    startRoom.mutate(sessionId)
  }

  // joiners: seed the local reducer once the host's word list lands (via poll or room:start)
  useEffect(() => {
    if (isHost || phase !== 'lobby' || !attributes?.words) return
    dispatch({ type: 'RESTART', words: attributes.words, duration: attributes.duration! })
  }, [isHost, phase, attributes?.words])

  useEffect(() => {
    if (phase === 'lobby' && (attributes?.status === 'racing' || roomChannel.phase === 'racing')) {
      setPhase('racing')
      inputRef.current?.focus()
    }
  }, [phase, attributes?.status, roomChannel.phase])

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

  const elapsed = state.duration - state.timer
  const liveWpm = elapsed > 0 ? (state.correctKeystroke * 12) / elapsed : 0
  const progressPct = state.words.length > 0 ? Math.min(100, (state.correctWords / (elapsed * 0.8 + 1)) * 10) : 0

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
