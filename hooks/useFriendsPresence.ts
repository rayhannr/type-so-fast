'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFriendsPresenceQuery, useFriendsQuery } from '@/lib/queries/social'
import { AgsSession } from '@/lib/queries/shared'
import { RealtimeEvent, useRealtimeEvent } from '@/lib/realtime'

// AGS reports a player online exactly while their Lobby socket is held open, and pushes
// userStatusNotif to their friends on every change. The server relays those as presence:changed,
// so this is a one-off snapshot plus a stream of deltas, scoped by AGS to the caller's own
// friends rather than to everyone in the namespace.
export const useFriendsPresence = (session: AgsSession | null): Set<string> => {
  const friends = useFriendsQuery(session)
  // Re-snapshot whenever the friend set changes: a newly accepted friend who was already online
  // never generates a status notification, so the delta stream alone would miss them.
  const friendIds = useMemo(
    () => (friends.data ?? []).map(friend => friend.userId).sort().join(','),
    [friends.data]
  )
  const presence = useFriendsPresenceQuery(session, friendIds)
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (presence.data) setOnlineUserIds(new Set(presence.data))
  }, [presence.data])

  useRealtimeEvent(
    session,
    'presence:changed',
    useCallback((payload: RealtimeEvent) => {
      const userId = payload.userId
      if (typeof userId !== 'string') return

      setOnlineUserIds(previous => {
        const next = new Set(previous)
        if (payload.availability === 'online') next.add(userId)
        else next.delete(userId)
        return next
      })
    }, [])
  )

  return onlineUserIds
}
