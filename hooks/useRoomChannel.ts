'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Language } from '@/constants/words'
import { useSendRoomProgressMutation } from '@/lib/queries/rooms'
import { AgsSession } from '@/lib/queries/shared'
import { RealtimeEvent, useRealtimeConnected, useRealtimeEvent } from '@/lib/realtime'
import { WordMode } from '@/lib/word-generators'

export interface RoomOpponentProgress {
  wpm: number
  progress: number
  sentAt: number
  final: boolean
}

// carried in the room:start broadcast so joiners get the words at the same instant the race
// starts, instead of waiting on the 2s attributes poll
interface RoomRaceSetup {
  words: string[]
  duration: number
  mode: WordMode
  language: Language
  startedAt: number
}

interface RoomChannelState {
  roster: Set<string>
  phase: 'waiting' | 'racing'
  raceSetup: RoomRaceSetup | null
  opponents: Record<string, RoomOpponentProgress>
  connected: boolean
  publishProgress: (wpm: number, progress: number, options?: { force?: boolean; final?: boolean }) => void
}

// Room matches sync live progress over the player's AGS Lobby socket instead of WebRTC — see
// docs/ags-plans/2026-07-08-room-code-match.md: at up to 5 players a full WebRTC mesh (10 peer
// connections) multiplies the no-TURN NAT-failure risk already present at 2 players, and the
// attributes-based signaling relay used for PvP hits a race-condition complexity cliff well
// before 10 concurrent signaling writers.
//
// Lobby has no channel to subscribe to, so these events arrive on the same per-player connection
// as invites and presence; the server addresses them to the room's members explicitly.
export const useRoomChannel = (session: AgsSession | null, sessionId: string | null): RoomChannelState => {
  const [roster, setRoster] = useState<Set<string>>(new Set())
  const [phase, setPhase] = useState<'waiting' | 'racing'>('waiting')
  const [raceSetup, setRaceSetup] = useState<RoomRaceSetup | null>(null)
  const [opponents, setOpponents] = useState<Record<string, RoomOpponentProgress>>({})
  const connected = useRealtimeConnected(session)
  const sendProgress = useSendRoomProgressMutation(session)
  const lastPublishRef = useRef(0)

  // one connection serves every room this player enters, so entering a new one has to clear the
  // previous race's state rather than relying on a subscription teardown to do it
  useEffect(() => {
    setRoster(new Set())
    setPhase('waiting')
    setRaceSetup(null)
    setOpponents({})
  }, [sessionId])

  useRealtimeEvent(
    session,
    'room:joined',
    useCallback((payload: RealtimeEvent) => {
      const userId = payload.userId
      if (typeof userId === 'string') setRoster(previous => new Set(previous).add(userId))
    }, [])
  )

  useRealtimeEvent(
    session,
    'room:start',
    useCallback((payload: RealtimeEvent) => {
      const setup = payload as unknown as RoomRaceSetup
      if (setup.words?.length) setRaceSetup(setup)
      setPhase('racing')
    }, [])
  )

  useRealtimeEvent(
    session,
    'room:progress',
    useCallback((payload: RealtimeEvent) => {
      const { userId, wpm, progress, sentAt, final } = payload as unknown as RoomOpponentProgress & { userId: string }
      if (typeof userId !== 'string') return

      setOpponents(previous => {
        // separate POSTs racing through the notification pipeline have no delivery-order
        // guarantee — a throttled update sent earlier (lower wpm) can still arrive after the
        // forced final one and stomp it, so drop anything older than what's already stored
        if (previous[userId] && sentAt <= previous[userId].sentAt) return previous
        return { ...previous, [userId]: { wpm, progress, sentAt, final } }
      })
    }, [])
  )

  const publishProgress = (wpm: number, progress: number, options?: { force?: boolean; final?: boolean }) => {
    if (!sessionId) return
    // Throttle to roughly 2 updates/sec — frequent enough for a live feel, and well inside what
    // the notification pipeline delivers without loss even for a full 5-player room. This is
    // leading-edge only (no trailing send), so a burst of keystrokes right at race end can leave
    // the *final* wpm sample stuck inside the throttle window and never sent — callers must pass
    // force=true for the final publish so opponents don't get stuck on a stale mid-race value.
    const now = Date.now()
    if (!options?.force && now - lastPublishRef.current < 500) return
    lastPublishRef.current = now
    sendProgress.mutate({ sessionId, wpm, progress, sentAt: now, final: options?.final ?? false })
  }

  return { roster, phase, raceSetup, opponents, connected, publishProgress }
}
