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
  remoteSignal: SignalPayload | null
  peerReady: number
  onSignal: (signal: SignalPayload) => void
  onReady: () => void
}

interface RemotePlayer {
  connected: boolean
  failed: boolean
  remote: RemotePlayerSnapshot | null
  sendSnapshot: (snapshot: RemotePlayerSnapshot) => void
}

// Transport-agnostic: the caller delivers the peer's latest signal as `remoteSignal` and sends ours
// through `onSignal`. Trickle ICE: each side sends its SDP as soon as it's created, then resends
// it with the growing candidate list as candidates arrive, so the other side can start connecting
// on partial candidates instead of waiting for gathering to finish. `onReady` fires once this
// side's connection exists, and each bump of `peerReady` resends our latest signal, so a signal
// the peer missed because it wasn't listening yet is recovered.
export const useRemotePlayer = ({ isOfferer, active, turnServers, remoteSignal, peerReady, onSignal, onReady }: Params): RemotePlayer => {
  const [connected, setConnected] = useState(false)
  const [failed, setFailed] = useState(false)
  const [remote, setRemote] = useState<RemotePlayerSnapshot | null>(null)
  const channelRef = useRef<RTCDataChannel | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const remoteDescriptionRef = useRef<Promise<void> | null>(null)
  const appliedCandidatesRef = useRef(new Set<string>())
  const publishRef = useRef<(() => void) | null>(null)
  const onSignalRef = useRef(onSignal)
  onSignalRef.current = onSignal
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

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
      if (sdp) onSignalRef.current({ sdp, candidates: [...candidates] })
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
    onReadyRef.current()

    return () => {
      if (flushTimeout) clearTimeout(flushTimeout)
      pc.close()
      pcRef.current = null
      publishRef.current = null
      channelRef.current = null
      remoteDescriptionRef.current = null
      appliedCandidatesRef.current = new Set()
      setConnected(false)
      setFailed(false)
    }
  }, [active, isOfferer])

  useEffect(() => {
    if (peerReady > 0) publishRef.current?.()
  }, [peerReady])

  // apply the peer's sdp as soon as it lands (the non-offerer then answers through the same
  // trickle path), then any candidates not yet applied. Signals can arrive out of order, so a later
  // one may carry a shorter list than an earlier one; dedupe by candidate string rather than
  // trusting the list to only grow. `active` is a dependency because a signal can arrive before
  // this side's connection exists.
  useEffect(() => {
    const pc = pcRef.current
    if (!pc || !remoteSignal) return

    const applyCandidates = () =>
      remoteSignal.candidates.forEach(candidate => {
        const key = candidate.candidate ?? ''
        if (appliedCandidatesRef.current.has(key)) return
        appliedCandidatesRef.current.add(key)
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      })

    if (remoteDescriptionRef.current) {
      remoteDescriptionRef.current.then(applyCandidates, () => {})
      return
    }

    remoteDescriptionRef.current = pc
      .setRemoteDescription(new RTCSessionDescription(remoteSignal.sdp))
      .then(async () => {
        if (!isOfferer) {
          await pc.setLocalDescription(await pc.createAnswer())
          publishRef.current?.()
        }
      })
    remoteDescriptionRef.current.then(applyCandidates, () => {
      if (pc.connectionState !== 'closed') setFailed(true)
    })
  }, [active, isOfferer, remoteSignal])

  const sendSnapshot = (snapshot: RemotePlayerSnapshot) => {
    if (channelRef.current?.readyState === 'open') channelRef.current.send(JSON.stringify(snapshot))
  }

  return { connected, failed, remote, sendSnapshot }
}
