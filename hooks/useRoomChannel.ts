'use client'

import { useEffect, useRef, useState } from 'react'
import Pusher from 'pusher-js'
import { useSendRoomProgressMutation } from '@/lib/queries/rooms'
import { AgsSession } from '@/lib/queries/shared'
import { WordMode } from '@/lib/word-generators'
import { Language } from '@/constants/words'

export interface RoomOpponentProgress {
  wpm: number
  progress: number
}

// carried in the room:start broadcast so joiners get the words at the same instant the race
// starts, instead of waiting on the 2s attributes poll
interface RoomRaceSetup {
  words: string[]
  duration: number
  mode: WordMode
  language: Language
}

interface RoomChannelState {
  roster: Set<string>
  phase: 'waiting' | 'racing'
  raceSetup: RoomRaceSetup | null
  opponents: Record<string, RoomOpponentProgress>
  connected: boolean
  publishProgress: (wpm: number, progress: number) => void
}

// Room matches sync live progress over a Pusher channel instead of WebRTC — see
// docs/ags-plans/2026-07-08-room-code-match.md: at up to 5 players a full WebRTC mesh (10 peer
// connections) multiplies the no-TURN NAT-failure risk already present at 2 players, and the
// attributes-based signaling relay used for PvP hits a race-condition complexity cliff well
// before 10 concurrent signaling writers.
export const useRoomChannel = (session: AgsSession | null, sessionId: string | null): RoomChannelState => {
  const [roster, setRoster] = useState<Set<string>>(new Set())
  const [phase, setPhase] = useState<'waiting' | 'racing'>('waiting')
  const [raceSetup, setRaceSetup] = useState<RoomRaceSetup | null>(null)
  const [opponents, setOpponents] = useState<Record<string, RoomOpponentProgress>>({})
  const [connected, setConnected] = useState(false)
  const sendProgress = useSendRoomProgressMutation(session)
  const lastPublishRef = useRef(0)

  useEffect(() => {
    if (!session || !sessionId) return

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      channelAuthorization: {
        endpoint: '/api/pusher/auth',
        transport: 'ajax',
        headers: { Authorization: `Bearer ${session.accessToken}`, 'X-User-Id': session.userId },
      },
    })

    const channel = pusher.subscribe(`private-room-${sessionId}`)
    channel.bind('pusher:subscription_succeeded', () => setConnected(true))
    channel.bind('pusher:subscription_error', () => setConnected(false))
    channel.bind('room:joined', ({ userId }: { userId: string }) => setRoster((prev) => new Set(prev).add(userId)))
    channel.bind('room:start', (setup: RoomRaceSetup) => {
      if (setup?.words?.length) setRaceSetup(setup)
      setPhase('racing')
    })
    channel.bind('room:progress', ({ userId, wpm, progress }: { userId: string; wpm: number; progress: number }) =>
      setOpponents((prev) => ({ ...prev, [userId]: { wpm, progress } }))
    )

    // reset per-channel state so a new room doesn't inherit the previous race's
    return () => {
      pusher.unsubscribe(`private-room-${sessionId}`)
      pusher.disconnect()
      setConnected(false)
      setRoster(new Set())
      setPhase('waiting')
      setRaceSetup(null)
      setOpponents({})
    }
  }, [session, sessionId])

  const publishProgress = (wpm: number, progress: number) => {
    if (!sessionId) return
    // Throttle to roughly 2 updates/sec — frequent enough for a live feel, far under Pusher's
    // free-tier message budget even with a full 5-player room (see the room-code plan doc).
    const now = Date.now()
    if (now - lastPublishRef.current < 500) return
    lastPublishRef.current = now
    sendProgress.mutate({ sessionId, wpm, progress })
  }

  return { roster, phase, raceSetup, opponents, connected, publishProgress }
}
