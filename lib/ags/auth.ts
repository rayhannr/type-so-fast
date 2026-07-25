import { UsersApi, OAuth20Api } from '@accelbyte/sdk-iam'
import { createSdk } from './sdk'

export interface AgsSession {
  userId: string
  accessToken: string
}

// Public IAM client has no secret; the platform-token endpoint still requires HTTP Basic auth
// with an empty password (verified live, same pattern as adminToken.ts's confidential-client call).
const withPublicClientAuth = () => {
  const basicAuth = Buffer.from(`${process.env.ACCELBYTE_CLIENT_ID}:`).toString('base64')
  return OAuth20Api(createSdk(), { axiosConfig: { request: { headers: { Authorization: `Basic ${basicAuth}` } } } })
}

const loginWithPlatformToken = async (
  platformId: string,
  params: { device_id?: string; platform_token?: string }
): Promise<AgsSession> => {
  const { data } = await withPublicClientAuth().postTokenOauth_ByPlatformId_v3(platformId, {
    createHeadless: true,
    ...params
  })

  return { userId: data.user_id, accessToken: data.access_token }
}

export const loginWithDeviceId = (deviceId: string): Promise<AgsSession> =>
  loginWithPlatformToken('device', { device_id: deviceId })

export const loginWithGoogle = (googleIdToken: string): Promise<AgsSession> =>
  loginWithPlatformToken('google', { platform_token: googleIdToken })

export const linkGoogleAccount = async (session: AgsSession, googleIdToken: string): Promise<void> => {
  const usersApi = UsersApi(createSdk(session.accessToken))
  await usersApi.postUserMePlatform_ByPlatformId_v3('google', { ticket: googleIdToken })
}

export const unlinkGoogleAccount = async (session: AgsSession): Promise<void> => {
  const usersApi = UsersApi(createSdk(session.accessToken))
  await usersApi.deleteAllMeUser_ByPlatformId_v3('google')
}

export const getLinkedGoogleAccount = async (session: AgsSession): Promise<{ displayName: string | null } | null> => {
  const usersApi = UsersApi(createSdk(session.accessToken))
  const { data } = await usersApi.getPlatforms_ByUserId_v3(session.userId, { platformId: 'google' })

  const google = data.data.find(platform => platform.platformId === 'google')
  return google ? { displayName: google.displayName ?? null } : null
}

export { createSdk }
