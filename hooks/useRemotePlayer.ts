'use client'

import { useEffect, useRef, useState } from 'react'
import { SignalPayload } from '@/lib/ags/session'

// STUN covers direct connections; the AGS TURN servers passed in as `turnServers` relay traffic
// when both peers are behind NATs that STUN can't punch through
const STUN_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

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
  turnServers: RTCIceServer[]
  offer?: SignalPayload
  answer?: SignalPayload
  onOffer: (signal: SignalPayload) => void
  onAnswer: (signal: SignalPayload) => void
}

interface RemotePlayer {
  connected: boolean
  failed: boolean
  remote: RemotePlayerSnapshot | null
  sendSnapshot: (snapshot: RemotePlayerSnapshot) => void
}

// Signaling rides on the session's `attributes` field (polled REST, see useSessionQuery)
// instead of AGS Lobby: Lobby's websocket requires an Authorization header at handshake
// time, which a browser WebSocket client can't send, confirmed by three failed spikes
// (docs/ags-plans/2026-07-07-pvp-quick-match.md). Trickle ICE: each side writes its SDP as
// soon as it's created, then writes the growing candidate list as candidates arrive, instead
// of waiting for gathering to fully finish, the other side can start connecting on partial
// candidates rather than sitting idle for the whole gathering round trip.
export const useRemotePlayer = ({ isOfferer, active, turnServers, offer, answer, onOffer, onAnswer }: Params): RemotePlayer => {
  const [connected, setConnected] = useState(false)
  const [failed, setFailed] = useState(false)
  const [remote, setRemote] = useState<RemotePlayerSnapshot | null>(null)
  const channelRef = useRef<RTCDataChannel | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const remoteDescriptionSetRef = useRef(false)
  const appliedCandidatesRef = useRef(new Set<string>())
  const publishRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!active) return

    const pc = new RTCPeerConnection({ iceServers: [...STUN_SERVERS, ...turnServers] })
    pcRef.current = pc
    const candidates: RTCIceCandidateInit[] = []
    // a closed connection is this effect's own cleanup, not a failure
    const fail = () => {
      if (pc.connectionState !== 'closed') setFailed(true)
    }
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'failed') fail()
    })
    let flushTimeout: ReturnType<typeof setTimeout> | null = null

    const publish = () => {
      const sdp = pc.localDescription
      if (!sdp) return
      if (isOfferer) onOffer({ sdp, candidates: [...candidates] })
      else onAnswer({ sdp, candidates: [...candidates] })
    }
    publishRef.current = publish

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
        .then(publish)
        .catch(fail)
    } else {
      pc.addEventListener('datachannel', event => attachChannel(event.channel))
    }

    return () => {
      if (flushTimeout) clearTimeout(flushTimeout)
      pc.close()
      pcRef.current = null
      publishRef.current = null
      channelRef.current = null
      remoteDescriptionSetRef.current = false
      appliedCandidatesRef.current = new Set()
      setConnected(false)
      setFailed(false)
    }
  }, [active, isOfferer])

  // non-offerer: apply the offer's sdp as soon as it lands, then publish the answer through the
  // same trickle path as the offerer, so candidates gathered afterwards keep being written out
  useEffect(() => {
    const pc = pcRef.current
    if (isOfferer || !pc || !offer || remoteDescriptionSetRef.current) return
    remoteDescriptionSetRef.current = true
    pc.setRemoteDescription(new RTCSessionDescription(offer.sdp))
      .then(() => pc.createAnswer())
      .then(answerDescription => pc.setLocalDescription(answerDescription))
      .then(() => publishRef.current?.())
      .catch(() => {
        if (pc.connectionState !== 'closed') setFailed(true)
      })
  }, [isOfferer, offer])

  // offerer: apply the answer's sdp as soon as it lands
  useEffect(() => {
    const pc = pcRef.current
    if (!isOfferer || !pc || !answer || remoteDescriptionSetRef.current) return
    remoteDescriptionSetRef.current = true
    pc.setRemoteDescription(new RTCSessionDescription(answer.sdp)).catch(() => {
      if (pc.connectionState !== 'closed') setFailed(true)
    })
  }, [isOfferer, answer])

  // apply newly-arrived candidates from whichever side we're not. Writes can land out of order, so
  // a poll may briefly show a shorter list than an earlier one; dedupe by candidate string rather
  // than trusting the list to only grow
  useEffect(() => {
    const pc = pcRef.current
    const signal = isOfferer ? answer : offer
    if (!pc || !signal || !remoteDescriptionSetRef.current) return
    signal.candidates.forEach(candidate => {
      const key = candidate.candidate ?? ''
      if (appliedCandidatesRef.current.has(key)) return
      appliedCandidatesRef.current.add(key)
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
    })
  }, [isOfferer, offer, answer])

  const sendSnapshot = (snapshot: RemotePlayerSnapshot) => {
    if (channelRef.current?.readyState === 'open') channelRef.current.send(JSON.stringify(snapshot))
  }

  return { connected, failed, remote, sendSnapshot }
}
