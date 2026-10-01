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

// Cloud Run counts a websocket as an in-flight request and bills the instance for as long as it
// stays open, so a tab nobody is looking at drops its socket and reconnects once visible again.
// Reconnecting is also routine because Cloud Run cuts a websocket at its request timeout.
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
    if (this.closed || this.paused) return

    const base = process.env.NEXT_PUBLIC_GO_BACKEND_URL!
    this.socket = new WebSocket(`${base.replace(/^http/, 'ws')}/api/realtime`)

    this.socket.onopen = () => {
      // A browser WebSocket cannot set an Authorization header, so the server takes credentials
      // in the first frame instead of the query string, which would land in access logs.
      this.socket?.send(JSON.stringify({ token: this.session.accessToken, userId: this.session.userId }))
      this.reconnectAttempt = 0
      this.setConnected(true)
    }

    this.socket.onmessage = event => {
      let payload: RealtimeEvent
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }
      this.listeners.get(payload.event)?.forEach(listener => listener(payload))
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
