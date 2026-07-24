'use client'

import { useEffect, useRef, useState } from 'react'
import { SignalPayload } from '@/lib/ags/session'

// TODO: swap for AGS's TURN relay credentials once the exact fetch endpoint is confirmed
// (see docs/ags-plans/2026-07-07-pvp-quick-match.md Risks) — public STUN is enough for direct
// connections but has no fallback when both peers are behind restrictive NATs.
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

// how long to batch newly-gathered candidates before writing them out, so a burst of candidates
// (STUN typically returns several close together) becomes one signal write instead of many
const CANDIDATE_FLUSH_DELAY_MS = 150

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
// (docs/ags-plans/2026-07-07-pvp-quick-match.md). Trickle ICE: each side writes its SDP as
// soon as it's created, then writes the growing candidate list as candidates arrive, instead
// of waiting for gathering to fully finish — the other side can start connecting on partial
// candidates rather than sitting idle for the whole gathering round trip.
export const useRemotePlayer = ({ isOfferer, active, offer, answer, onOffer, onAnswer }: Params): RemotePlayer => {
  const [connected, setConnected] = useState(false)
  const [remote, setRemote] = useState<RemotePlayerSnapshot | null>(null)
  const channelRef = useRef<RTCDataChannel | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const remoteDescriptionSetRef = useRef(false)
  const appliedCandidateCountRef = useRef(0)

  useEffect(() => {
    if (!active) return

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc
    const candidates: RTCIceCandidateInit[] = []
    let localDescription: RTCSessionDescription | null = null
    let flushTimeout: ReturnType<typeof setTimeout> | null = null

    const publish = () => {
      if (!localDescription) return
      if (isOfferer) onOffer({ sdp: localDescription, candidates: [...candidates] })
      else onAnswer({ sdp: localDescription, candidates: [...candidates] })
    }

    const scheduleFlush = () => {
      if (flushTimeout) return
      flushTimeout = setTimeout(() => {
        flushTimeout = null
        publish()
      }, CANDIDATE_FLUSH_DELAY_MS)
    }

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
      if (!event.candidate) return
      candidates.push(event.candidate.toJSON())
      scheduleFlush()
    })

    if (isOfferer) {
      attachChannel(pc.createDataChannel('race-progress'))
      pc.createOffer()
        .then(offerDescription => pc.setLocalDescription(offerDescription))
        .then(() => {
          localDescription = pc.localDescription
          publish()
        })
        .catch(() => {})
    } else {
      pc.addEventListener('datachannel', event => attachChannel(event.channel))
    }

    return () => {
      if (flushTimeout) clearTimeout(flushTimeout)
      pc.close()
      pcRef.current = null
      channelRef.current = null
      remoteDescriptionSetRef.current = false
      appliedCandidateCountRef.current = 0
      setConnected(false)
    }
  }, [active, isOfferer])

  // non-offerer: apply the offer's sdp as soon as it lands, then apply the answer's own local
  // description once created — same trickle-publish shape as the offerer side
  useEffect(() => {
    const pc = pcRef.current
    if (isOfferer || !pc || !offer || remoteDescriptionSetRef.current) return
    remoteDescriptionSetRef.current = true
    pc.setRemoteDescription(new RTCSessionDescription(offer.sdp))
      .then(() => pc.createAnswer())
      .then(answerDescription => pc.setLocalDescription(answerDescription))
      .then(() => {
        if (pc.localDescription) onAnswer({ sdp: pc.localDescription, candidates: [] })
      })
      .catch(() => {})
  }, [isOfferer, offer])

  // offerer: apply the answer's sdp as soon as it lands
  useEffect(() => {
    const pc = pcRef.current
    if (!isOfferer || !pc || !answer || remoteDescriptionSetRef.current) return
    remoteDescriptionSetRef.current = true
    pc.setRemoteDescription(new RTCSessionDescription(answer.sdp)).catch(() => {})
  }, [isOfferer, answer])

  // apply newly-arrived candidates from whichever side we're not — the signal's candidate list
  // only grows, so track how many we've already added and add just the new tail each update
  useEffect(() => {
    const pc = pcRef.current
    const signal = isOfferer ? answer : offer
    if (!pc || !signal || !remoteDescriptionSetRef.current) return
    const newCandidates = signal.candidates.slice(appliedCandidateCountRef.current)
    if (newCandidates.length === 0) return
    appliedCandidateCountRef.current = signal.candidates.length
    newCandidates.forEach(candidate => {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
    })
  }, [isOfferer, offer, answer])

  const sendSnapshot = (snapshot: RemotePlayerSnapshot) => {
    if (channelRef.current?.readyState === 'open') channelRef.current.send(JSON.stringify(snapshot))
  }

  return { connected, remote, sendSnapshot }
}
