import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserSummary } from '@/lib/ags/displayName'
import { agsErrorMessage, authHeaders } from './shared'
import type { AgsSession } from './shared'

const friendsKey = (userId: string) => ['friends', userId] as const
export const incomingFriendRequestsKey = (userId: string) => ['incomingFriendRequests', userId] as const
const blockedUsersKey = (userId: string) => ['blockedUsers', userId] as const

export const useFriendsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: friendsKey(session?.userId ?? ''),
    queryFn: () => axios.get<UserSummary[]>('/api/friends', { headers: authHeaders(session!) }).then((res) => res.data),
    enabled: !!session,
  })

export const useIncomingFriendRequestsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: incomingFriendRequestsKey(session?.userId ?? ''),
    queryFn: () => axios.get<UserSummary[]>('/api/friends/incoming', { headers: authHeaders(session!) }).then((res) => res.data),
    enabled: !!session,
  })

export const useAddFriendMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: (publicId: string) => axios.post('/api/friends', { publicId }, { headers: authHeaders(session!) }),
  })

// AGS Lobby friend-request error codes:
// https://docs.accelbyte.io/gaming-services/knowledge-base/lobby-error-codes/
const addFriendErrorMessages: Record<number, string> = {
  11970: "That's your own code — share it with a friend instead.",
  11973: "You've already sent this player a request — waiting for them to accept.",
  11974: 'This player already sent you a request — accept it under Requests.',
  11703: "You're already friends with this player.",
  11590: 'Your friend list is full.',
  11591: 'Their friend list is full.',
}

export const addFriendErrorMessage = (error: unknown): string =>
  agsErrorMessage(error, addFriendErrorMessages, "Couldn't send the request — check the code and try again.")

export const useAcceptFriendRequestMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendUserId: string) => axios.post(`/api/friends/${friendUserId}/accept`, {}, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) {
        queryClient.invalidateQueries({ queryKey: friendsKey(session.userId) })
        queryClient.invalidateQueries({ queryKey: incomingFriendRequestsKey(session.userId) })
      }
    },
  })
}

export const useDeclineFriendRequestMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendUserId: string) => axios.post(`/api/friends/${friendUserId}/decline`, {}, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) queryClient.invalidateQueries({ queryKey: incomingFriendRequestsKey(session.userId) })
    },
  })
}

export const useRemoveFriendMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendUserId: string) => axios.delete(`/api/friends/${friendUserId}`, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) queryClient.invalidateQueries({ queryKey: friendsKey(session.userId) })
    },
  })
}

export const useBlockedUsersQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: blockedUsersKey(session?.userId ?? ''),
    queryFn: () => axios.get<UserSummary[]>('/api/blocks', { headers: authHeaders(session!) }).then((res) => res.data),
    enabled: !!session,
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
    },
  })
}

export const useUnblockUserMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => axios.delete(`/api/blocks/${userId}`, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) queryClient.invalidateQueries({ queryKey: blockedUsersKey(session.userId) })
    },
  })
}
