import { UsersAdminApi, UsersApi } from '@accelbyte/sdk-iam'
import { fakerEN } from '@faker-js/faker'
import { getAdminAccessToken } from './adminToken'
import { createSdk } from './sdk'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const generateDisplayName = () => `${capitalize(fakerEN.word.adjective())} ${capitalize(fakerEN.word.noun())}`

// Headless Device ID accounts are created with an empty IAM displayName (verified live),
// so the first load assigns one and every later load returns the stored value.
export const getOrCreateDisplayName = async (accessToken: string, localNameHint?: string): Promise<string> => {
  const usersApi = UsersApi(createSdk(accessToken))
  const { data } = await usersApi.getUsersMe_v3()
  if (data.displayName) return data.displayName

  const displayName = localNameHint || generateDisplayName()
  await usersApi.patchUserMe_v3({ displayName })
  return displayName
}

export const updateDisplayName = async (accessToken: string, displayName: string): Promise<string> => {
  const usersApi = UsersApi(createSdk(accessToken))
  await usersApi.patchUserMe_v3({ displayName })
  return displayName
}

export interface UserSummary {
  userId: string
  displayName: string
}

export const getUserSummaries = async (userIds: string[]): Promise<UserSummary[]> => {
  if (userIds.length === 0) return []
  const adminAccessToken = await getAdminAccessToken()
  const usersApi = UsersAdminApi(createSdk(adminAccessToken))
  const { data } = await usersApi.createUserBulk_v3({ userIds })
  const names = new Map(data.data.map(user => [user.userId, user.displayName]))
  return userIds.map(userId => ({ userId, displayName: names.get(userId) || userId.slice(0, 8) }))
}
