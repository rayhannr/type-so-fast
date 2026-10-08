'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PvpRaceSetup, PvpSignalMessage, SignalPayload } from '@/lib/ags/session'
import { AgsSession } from '@/lib/queries/shared'
import { RealtimeEvent, useRealtimeEvent } from '@/lib/realtime'

interface PvpSignaling {
  remoteSignal: SignalPayload | null
  // bumps each time the peer reports ready, so the caller can resend its latest signal
  peerReady: number
  race: PvpRaceSetup | null
}

// The peer's WebRTC signals arrive pushed over this player's Lobby socket (sent through
// /api/session/:id/signal), scoped to the current session so a late signal from an abandoned
// match is dropped.
export const usePvpSignaling = (session: AgsSession | null, sessionId: string): PvpSignaling => {
  const [remoteSignal, setRemoteSignal] = useState<SignalPayload | null>(null)
  const [peerReady, setPeerReady] = useState(0)
  const [race, setRace] = useState<PvpRaceSetup | null>(null)
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId

  useEffect(() => {
    setRemoteSignal(null)
    setPeerReady(0)
    setRace(null)
  }, [sessionId])

  useRealtimeEvent(
    session,
    'pvp:signal',
    useCallback((payload: RealtimeEvent) => {
      if (!sessionIdRef.current || payload.sessionId !== sessionIdRef.current) return
      const message = payload as unknown as PvpSignalMessage
      if (message.kind === 'ready') {
        setPeerReady(count => count + 1)
        return
      }
      setRemoteSignal({ sdp: message.sdp, candidates: message.candidates })
      if (message.race) setRace(message.race)
    }, [])
  )

  return { remoteSignal, peerReady, race }
}
