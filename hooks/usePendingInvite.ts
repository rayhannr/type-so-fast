'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { AgsSession } from '@/lib/queries/shared'
import { incomingFriendRequestsKey } from '@/lib/queries/social'
import { useRealtimeConnected, useRealtimeEvent } from '@/lib/realtime'

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

// Every invite-related event for this user arrives on their own Lobby socket: someone invited
// them (invite:new), someone accepted an invite they sent (invite:accepted), declined one
// (invite:declined), or sent a friend request (friend:request) — all delivered live, with no
// fallback poll
export const usePendingInvite = (session: AgsSession | null): PendingInviteState => {
  const [invite, setInvite] = useState<PendingInvite | null>(null)
  const [acceptedInvite, setAcceptedInvite] = useState<AcceptedInvite | null>(null)
  const [declined, setDeclined] = useState(false)
  const queryClient = useQueryClient()
  const connected = useRealtimeConnected(session)

  useRealtimeEvent(session, 'invite:new', useCallback(payload => setInvite(payload as unknown as PendingInvite), []))
  useRealtimeEvent(
    session,
    'invite:accepted',
    useCallback(payload => setAcceptedInvite(payload as unknown as AcceptedInvite), [])
  )
  useRealtimeEvent(session, 'invite:declined', useCallback(() => setDeclined(true), []))
  useRealtimeEvent(
    session,
    'friend:request',
    useCallback(() => {
      if (session) queryClient.invalidateQueries({ queryKey: incomingFriendRequestsKey(session.userId) })
    }, [session, queryClient])
  )

  return {
    invite,
    acceptedInvite,
    declined,
    connected,
    dismissInvite: () => setInvite(null),
    dismissAcceptedInvite: () => setAcceptedInvite(null),
    dismissDeclined: () => setDeclined(false)
  }
}
