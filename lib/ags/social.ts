import { FriendsApi, PlayerApi } from '@accelbyte/sdk-lobby'
import { createSdk } from './sdk'

// getFriendsMe/getFriendsMeIncoming actually return the plain `{ friendIDs, paging }` object,
// not the one-element array their generated type (`GetUserFriendsResponseArray`) suggests —
// verified live. Schema validation is disabled globally (see lib/ags/sdk.ts), so this only
// needs a cast to the real shape.
export const listFriends = async (accessToken: string): Promise<string[]> => {
  const api = FriendsApi(createSdk(accessToken))
  const { data } = await api.getFriendsMe()
  return (data as unknown as { friendIDs?: string[] })?.friendIDs ?? []
}

export const listIncomingFriendRequests = async (accessToken: string): Promise<string[]> => {
  const api = FriendsApi(createSdk(accessToken))
  const { data } = await api.getFriendsMeIncoming()
  return (data as unknown as { friendIDs?: string[] })?.friendIDs ?? []
}

export const sendFriendRequest = async (accessToken: string, friendPublicId: string): Promise<void> => {
  const api = FriendsApi(createSdk(accessToken))
  await api.createFriendMeRequest({ friendPublicId })
}

export const acceptFriendRequest = async (accessToken: string, friendId: string): Promise<void> => {
  const api = FriendsApi(createSdk(accessToken))
  await api.createFriendMeRequestAccept({ friendId })
}

export const declineFriendRequest = async (accessToken: string, friendId: string): Promise<void> => {
  const api = FriendsApi(createSdk(accessToken))
  await api.createFriendMeRequestReject({ friendId })
}

export const removeFriend = async (accessToken: string, friendId: string): Promise<void> => {
  const api = FriendsApi(createSdk(accessToken))
  await api.createFriendMeUnfriend({ friendId })
}

export const blockUser = async (accessToken: string, userId: string): Promise<void> => {
  const api = PlayerApi(createSdk(accessToken))
  await api.createPlayerUserMeBlock({ blockedUserId: userId })
}

export const unblockUser = async (accessToken: string, userId: string): Promise<void> => {
  const api = PlayerApi(createSdk(accessToken))
  await api.createPlayerUserMeUnblock({ userId })
}

export const listBlockedUsers = async (accessToken: string): Promise<string[]> => {
  const api = PlayerApi(createSdk(accessToken))
  const { data } = await api.getPlayerUsersMeBlocked()
  return data.data.map(entry => entry.blockedUserId)
}
