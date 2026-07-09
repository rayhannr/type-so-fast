'use client'

import { useEffect, useState } from 'react'
import Pusher from 'pusher-js'
import type { PresenceChannel } from 'pusher-js'
import type { AgsSession } from '@/lib/queries/shared'

const PRESENCE_CHANNEL = 'presence-online-users'

// A single global presence channel broadcasts every online userId to all subscribers;
// callers filter this down to their own friend list.
export const useFriendsPresence = (session: AgsSession | null): Set<string> => {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())

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

    const channel = pusher.subscribe(PRESENCE_CHANNEL) as PresenceChannel

    const syncMembers = () => {
      const ids = new Set<string>()
      channel.members.each((member: { id: string }) => ids.add(member.id))
      setOnlineUserIds(ids)
    }

    channel.bind('pusher:subscription_succeeded', syncMembers)
    channel.bind('pusher:member_added', syncMembers)
    channel.bind('pusher:member_removed', syncMembers)

    return () => {
      pusher.unsubscribe(PRESENCE_CHANNEL)
      pusher.disconnect()
      setOnlineUserIds(new Set())
    }
  }, [session])

  return onlineUserIds
}
