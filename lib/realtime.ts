'use client'

import { useEffect, useRef, useState } from 'react'
import { AgsSession } from '@/lib/queries/shared'

// Lobby delivers one opaque string per notification, so the event name rides inside the payload
// rather than arriving as a separate channel/event pair.
export interface RealtimeEvent {
  event: string
  [key: string]: unknown
}

type Listener = (payload: RealtimeEvent) => void

const RECONNECT_BASE_MS = 500
const RECONNECT_MAX_MS = 15_000
const HIDDEN_DISCONNECT_MS = 60_000

// Lobby frames are newline-delimited `key: value` text. Only the first colon on a line separates
// key from value, since a freeform payload is JSON and carries colons of its own.
const parseLobbyFrame = (raw: string) => {
  const frame: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    frame[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
  }
  return frame
}

// Turns a raw Lobby frame into the event the app listens for, or null for frames it has no use for.
// A freeform notification carries the sender's own JSON, and AGS pushes userStatusNotif to a
// player's friends whenever someone's Lobby socket opens or closes.
export const parseLobbyMessage = (raw: string): RealtimeEvent | null => {
  const frame = parseLobbyFrame(raw)

  if (frame.type === 'messageNotif') {
    try {
      const payload = JSON.parse(frame.payload)
      return typeof payload?.event === 'string' ? payload : null
    } catch {
      return null
    }
  }

  if (frame.type === 'userStatusNotif') {
    return { event: 'presence:changed', userId: frame.userID, availability: frame.availability }
  }

  return null
}

// The player's own Lobby socket is held open for as long as they are on the site, which is also
// what AGS counts as them being online. A tab nobody is looking at drops it and reconnects once
// visible again, so a forgotten tab neither holds a connection nor shows as online indefinitely.
class RealtimeConnection {
  private socket: WebSocket | null = null
  private listeners = new Map<string, Set<Listener>>()
  private connectionListeners = new Set<(connected: boolean) => void>()
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private hiddenTimer: ReturnType<typeof setTimeout> | null = null
  private closed = false
  private paused = false
  private holders = 0

  connected = false

  constructor(private session: AgsSession) {
    this.open()
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.hiddenTimer = setTimeout(() => this.pause(), HIDDEN_DISCONNECT_MS)
      return
    }

    if (this.hiddenTimer) clearTimeout(this.hiddenTimer)
    this.hiddenTimer = null
    if (!this.paused) return

    this.paused = false
    this.reconnectAttempt = 0
    this.open()
  }

  private pause() {
    this.paused = true
    this.hiddenTimer = null
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.socket?.close()
  }

  private open() {
    if (this.closed || this.paused || !this.session.lobbyUrl) return

    // A browser WebSocket cannot set an Authorization header, so Lobby also accepts the access
    // token as the one requested subprotocol.
    this.socket = new WebSocket(this.session.lobbyUrl, this.session.accessToken)

    this.socket.onopen = () => {
      this.reconnectAttempt = 0
      this.setConnected(true)
    }

    this.socket.onmessage = event => {
      const payload = parseLobbyMessage(String(event.data))
      if (payload) this.listeners.get(payload.event)?.forEach(listener => listener(payload))
    }

    this.socket.onclose = () => {
      this.setConnected(false)
      this.scheduleReconnect()
    }

    this.socket.onerror = () => this.socket?.close()
  }

  private scheduleReconnect() {
    if (this.closed || this.paused || this.reconnectTimer) return

    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_MS)
    this.reconnectAttempt += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, delay)
  }

  private setConnected(connected: boolean) {
    this.connected = connected
    this.connectionListeners.forEach(listener => listener(connected))
  }

  on(event: string, listener: Listener) {
    const existing = this.listeners.get(event) ?? new Set<Listener>()
    existing.add(listener)
    this.listeners.set(event, existing)

    return () => {
      existing.delete(listener)
      if (existing.size === 0) this.listeners.delete(event)
    }
  }

  onConnectionChange(listener: (connected: boolean) => void) {
    this.connectionListeners.add(listener)
    return () => this.connectionListeners.delete(listener)
  }

  retain() {
    this.holders += 1
  }

  // The connection is shared across hooks, so it only tears down once the last of them unmounts.
  release() {
    this.holders -= 1
    if (this.holders > 0) return

    this.closed = true
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    if (this.hiddenTimer) clearTimeout(this.hiddenTimer)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.socket?.close()
    if (shared?.connection === this) shared = null
  }
}

let shared: { userId: string; connection: RealtimeConnection } | null = null

const connectionFor = (session: AgsSession) => {
  if (shared?.userId !== session.userId) {
    shared = { userId: session.userId, connection: new RealtimeConnection(session) }
  }
  return shared.connection
}

// The effect keys on the session's identifying fields rather than the object, and reads the
// handler through a ref, so an inline arrow or a freshly-allocated session object does not
// release the shared connection and immediately rebuild it on every render.
export const useRealtimeEvent = (session: AgsSession | null, event: string, handler: Listener) => {
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    if (!sessionRef.current) return

    const connection = connectionFor(sessionRef.current)
    connection.retain()
    const off = connection.on(event, payload => handlerRef.current(payload))

    return () => {
      off()
      connection.release()
    }
  }, [session?.userId, session?.accessToken, event])
}

export const useRealtimeConnected = (session: AgsSession | null) => {
  const [connected, setConnected] = useState(false)
  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    if (!sessionRef.current) return

    const connection = connectionFor(sessionRef.current)
    connection.retain()
    setConnected(connection.connected)
    const off = connection.onConnectionChange(setConnected)

    return () => {
      off()
      connection.release()
      setConnected(false)
    }
  }, [session?.userId, session?.accessToken])

  return connected
}
