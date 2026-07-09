'use client'

import { useEffect, useState } from 'react'
import Pusher from 'pusher-js'
import type { AgsSession } from './queries/shared'

export interface PendingInvite {
  inviterUserId: string
}

interface PendingInviteState {
  invite: PendingInvite | null
  connected: boolean
}

export const usePendingInvite = (session: AgsSession | null): PendingInviteState => {
  const [invite, setInvite] = useState<PendingInvite | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!session) return

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      channelAuthorization: {
        endpoint: '/api/pusher/auth',
        transport: 'ajax',
        headers: { Authorization: `Bearer ${session.accessToken}`, 'X-User-Id': session.userId },
      },
    })

    const channel = pusher.subscribe(`private-user-${session.userId}`)
    channel.bind('pusher:subscription_succeeded', () => setConnected(true))
    channel.bind('pusher:subscription_error', () => setConnected(false))
    channel.bind('invite:new', (data: PendingInvite) => setInvite(data))

    return () => {
      pusher.unsubscribe(`private-user-${session.userId}`)
      pusher.disconnect()
      setConnected(false)
    }
  }, [session])

  return { invite, connected }
}
