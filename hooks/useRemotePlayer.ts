'use client'

import { useEffect, useRef, useState } from 'react'
import { SignalPayload } from '@/lib/ags/session'

// TODO: swap for AGS's TURN relay credentials once the exact fetch endpoint is confirmed
// (see docs/ags-plans/2026-07-07-pvp-quick-match.md Risks) — public STUN is enough for direct
// connections but has no fallback when both peers are behind restrictive NATs.
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

export interface RemotePlayerSnapshot {
  words: string[]
  wordInput: string
  correctKeystroke: number
  wrongKeystroke: number
}

interface Params {
  isOfferer: boolean
  active: boolean
  offer?: SignalPayload
  answer?: SignalPayload
  onOffer: (signal: SignalPayload) => void
  onAnswer: (signal: SignalPayload) => void
}

interface RemotePlayer {
  connected: boolean
  remote: RemotePlayerSnapshot | null
  sendSnapshot: (snapshot: RemotePlayerSnapshot) => void
}

// Signaling rides on the session's `attributes` field (polled REST, see useSessionQuery)
// instead of AGS Lobby: Lobby's websocket requires an Authorization header at handshake
// time, which a browser WebSocket client can't send — confirmed by three failed spikes
// (docs/ags-plans/2026-07-07-pvp-quick-match.md). Non-trickle ICE: each side waits for its
// own candidate gathering to finish, then writes one signal payload instead of streaming
// candidates one at a time.
export const useRemotePlayer = ({ isOfferer, active, offer, answer, onOffer, onAnswer }: Params): RemotePlayer => {
  const [connected, setConnected] = useState(false)
  const [remote, setRemote] = useState<RemotePlayerSnapshot | null>(null)
  const channelRef = useRef<RTCDataChannel | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const remoteDescriptionSetRef = useRef(false)

  useEffect(() => {
    if (!active) return

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc
    const candidates: RTCIceCandidateInit[] = []

    const attachChannel = (channel: RTCDataChannel) => {
      channelRef.current = channel
      channel.addEventListener('open', () => setConnected(true))
      channel.addEventListener('close', () => setConnected(false))
      channel.addEventListener('message', event => {
        try {
          setRemote(JSON.parse(event.data))
        } catch {
          // ignore malformed frames
        }
      })
    }

    pc.addEventListener('icecandidate', event => {
      if (event.candidate) candidates.push(event.candidate.toJSON())
    })

    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState !== 'complete' || !pc.localDescription) return
      if (isOfferer) onOffer({ sdp: pc.localDescription, candidates })
      else onAnswer({ sdp: pc.localDescription, candidates })
    })

    if (isOfferer) {
      attachChannel(pc.createDataChannel('race-progress'))
      pc.createOffer()
        .then(offerDescription => pc.setLocalDescription(offerDescription))
        .catch(() => {})
    } else {
      pc.addEventListener('datachannel', event => attachChannel(event.channel))
    }

    return () => {
      pc.close()
      pcRef.current = null
      channelRef.current = null
      remoteDescriptionSetRef.current = false
      setConnected(false)
    }
  }, [active, isOfferer])

  // non-offerer: apply the offer once it lands in session attributes
  useEffect(() => {
    const pc = pcRef.current
    if (isOfferer || !pc || !offer || remoteDescriptionSetRef.current) return
    remoteDescriptionSetRef.current = true
    pc.setRemoteDescription(new RTCSessionDescription(offer.sdp))
      .then(() => Promise.all(offer.candidates.map(c => pc.addIceCandidate(new RTCIceCandidate(c)))))
      .then(() => pc.createAnswer())
      .then(answerDescription => pc.setLocalDescription(answerDescription))
      .catch(() => {})
  }, [isOfferer, offer])

  // offerer: apply the answer once it lands in session attributes
  useEffect(() => {
    const pc = pcRef.current
    if (!isOfferer || !pc || !answer || remoteDescriptionSetRef.current) return
    remoteDescriptionSetRef.current = true
    pc.setRemoteDescription(new RTCSessionDescription(answer.sdp))
      .then(() => Promise.all(answer.candidates.map(c => pc.addIceCandidate(new RTCIceCandidate(c)))))
      .catch(() => {})
  }, [isOfferer, answer])

  const sendSnapshot = (snapshot: RemotePlayerSnapshot) => {
    if (channelRef.current?.readyState === 'open') channelRef.current.send(JSON.stringify(snapshot))
  }

  return { connected, remote, sendSnapshot }
}
