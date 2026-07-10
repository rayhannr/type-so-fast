'use client'

import { useEffect, useState } from 'react'
import Pusher from 'pusher-js'
import { useQueryClient } from '@tanstack/react-query'
import { incomingFriendRequestsKey } from '@/lib/queries/social'
import { AgsSession } from '@/lib/queries/shared'

export interface PendingInvite {
  inviterUserId: string
}

interface AcceptedInvite {
  sessionId: string
}

interface PendingInviteState {
  invite: PendingInvite | null
  acceptedInvite: AcceptedInvite | null
  declined: boolean
  connected: boolean
  dismissInvite: () => void
  dismissAcceptedInvite: () => void
  dismissDeclined: () => void
}

// Single private channel carries every invite-related event for this user: someone invited them
// (invite:new), someone accepted an invite they sent (invite:accepted), declined one
// (invite:declined), or sent a friend request (friend:request) — all delivered live, with no
// fallback poll
export const usePendingInvite = (session: AgsSession | null): PendingInviteState => {
  const [invite, setInvite] = useState<PendingInvite | null>(null)
  const [acceptedInvite, setAcceptedInvite] = useState<AcceptedInvite | null>(null)
  const [declined, setDeclined] = useState(false)
  const [connected, setConnected] = useState(false)
  const queryClient = useQueryClient()

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
    channel.bind('invite:accepted', (data: AcceptedInvite) => setAcceptedInvite(data))
    channel.bind('invite:declined', () => setDeclined(true))
    channel.bind('friend:request', () => queryClient.invalidateQueries({ queryKey: incomingFriendRequestsKey(session.userId) }))

    return () => {
      pusher.unsubscribe(`private-user-${session.userId}`)
      pusher.disconnect()
      setConnected(false)
    }
  }, [session, queryClient])

  return {
    invite,
    acceptedInvite,
    declined,
    connected,
    dismissInvite: () => setInvite(null),
    dismissAcceptedInvite: () => setAcceptedInvite(null),
    dismissDeclined: () => setDeclined(false),
  }
}
