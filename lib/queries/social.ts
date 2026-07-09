import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BlockedUser } from '@/lib/ags/social'
import { authHeaders } from './shared'
import type { AgsSession } from './shared'

const friendsKey = (userId: string) => ['friends', userId] as const
const incomingFriendRequestsKey = (userId: string) => ['incomingFriendRequests', userId] as const
const blockedUsersKey = (userId: string) => ['blockedUsers', userId] as const

export const useFriendsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: friendsKey(session?.userId ?? ''),
    queryFn: () => axios.get<string[]>('/api/friends', { headers: authHeaders(session!) }).then((res) => res.data),
    enabled: !!session,
  })

export const useIncomingFriendRequestsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: incomingFriendRequestsKey(session?.userId ?? ''),
    queryFn: () => axios.get<string[]>('/api/friends/incoming', { headers: authHeaders(session!) }).then((res) => res.data),
    enabled: !!session,
  })

export const useAddFriendMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: (publicId: string) => axios.post('/api/friends', { publicId }, { headers: authHeaders(session!) }),
  })

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
    queryFn: () => axios.get<BlockedUser[]>('/api/blocks', { headers: authHeaders(session!) }).then((res) => res.data),
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
