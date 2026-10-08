import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { UserSummary } from '@/lib/ags/displayName'
import { agsErrorMessage, authHeaders, AgsSession } from './shared'

export const friendsKey = (userId: string) => ['friends', userId] as const
export const incomingFriendRequestsKey = (userId: string) => ['incomingFriendRequests', userId] as const
const blockedUsersKey = (userId: string) => ['blockedUsers', userId] as const
export const friendsPresenceKey = (userId: string, friendIds: string) =>
  ['friendsPresence', userId, friendIds] as const

export const useFriendsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: friendsKey(session?.userId ?? ''),
    queryFn: () => axios.get<UserSummary[]>('/api/friends', { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session
  })

export const useIncomingFriendRequestsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: incomingFriendRequestsKey(session?.userId ?? ''),
    queryFn: () => axios.get<UserSummary[]>('/api/friends/incoming', { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session
  })

// The snapshot of who is online right now. Live changes after this arrive over the player's own
// realtime connection as presence:changed, so this never needs polling.
//
// friendIds is a cache key, not a request parameter: the server resolves the caller's friends
// itself so a client can't probe strangers' presence. Keying on it refetches the snapshot
// whenever the friend list changes, which matters because AGS only pushes a status notification
// on a *change*, befriending someone who is already online produces no notification at all.
export const useFriendsPresenceQuery = (session: AgsSession | null, friendIds: string) =>
  useQuery({
    queryKey: friendsPresenceKey(session?.userId ?? '', friendIds),
    queryFn: () =>
      axios
        .get<{ online: string[] }>('/api/presence', { headers: authHeaders(session!) })
        .then(res => res.data.online),
    enabled: !!session
  })

export const useAddFriendMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: (publicId: string) => axios.post('/api/friends', { publicId }, { headers: authHeaders(session!) })
  })

// AGS Lobby friend-request error codes:
// https://docs.accelbyte.io/gaming-services/knowledge-base/lobby-error-codes/
const addFriendErrorMessages: Record<number, string> = {
  11970: "That's your own code. Share it with a friend instead.",
  11973: "You've already sent this player a request. Waiting for them to accept.",
  11974: 'This player already sent you a request. Accept it under Requests.',
  11703: "You're already friends with this player.",
  11590: 'Your friend list is full.',
  11591: 'Their friend list is full.'
}

export const addFriendErrorMessage = (error: unknown): string =>
  agsErrorMessage(error, addFriendErrorMessages, "Couldn't send the request. Check the code and try again.")

export const useAcceptFriendRequestMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendUserId: string) => axios.post(`/api/friends/${friendUserId}/accept`, {}, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) {
        queryClient.invalidateQueries({ queryKey: friendsKey(session.userId) })
        queryClient.invalidateQueries({ queryKey: incomingFriendRequestsKey(session.userId) })
      }
    }
  })
}

export const useDeclineFriendRequestMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendUserId: string) => axios.post(`/api/friends/${friendUserId}/decline`, {}, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) queryClient.invalidateQueries({ queryKey: incomingFriendRequestsKey(session.userId) })
    }
  })
}

export const useRemoveFriendMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendUserId: string) => axios.delete(`/api/friends/${friendUserId}`, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) queryClient.invalidateQueries({ queryKey: friendsKey(session.userId) })
    }
  })
}

export const useBlockedUsersQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: blockedUsersKey(session?.userId ?? ''),
    queryFn: () => axios.get<UserSummary[]>('/api/blocks', { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session
  })

export const useBlockUserMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => axios.post('/api/blocks', { userId }, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) {
        queryClient.invalidateQueries({ queryKey: blockedUsersKey(session.userId) })
        queryClient.invalidateQueries({ queryKey: friendsKey(session.userId) })
      }
    }
  })
}

export const useUnblockUserMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => axios.delete(`/api/blocks/${userId}`, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) queryClient.invalidateQueries({ queryKey: blockedUsersKey(session.userId) })
    }
  })
}
