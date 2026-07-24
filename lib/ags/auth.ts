import axios from 'axios'
import { createSdk } from './sdk'

interface AgsTokenResponse {
  access_token: string
  refresh_token?: string
  user_id: string
}

export interface AgsSession {
  userId: string
  accessToken: string
}

const toSession = (data: AgsTokenResponse): AgsSession => ({ userId: data.user_id, accessToken: data.access_token })

const loginWithPlatformToken = async (platformId: string, params: Record<string, string>): Promise<AgsSession> => {
  const { data } = await axios.post<AgsTokenResponse>(
    `${process.env.ACCELBYTE_BASE_URL}/iam/v3/oauth/platforms/${platformId}/token`,
    new URLSearchParams({ create_headless: 'true', ...params }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: { username: process.env.ACCELBYTE_CLIENT_ID!, password: '' }
    }
  )

  return toSession(data)
}

export const loginWithDeviceId = (deviceId: string): Promise<AgsSession> =>
  loginWithPlatformToken('device', { device_id: deviceId })

export const loginWithGoogle = (googleIdToken: string): Promise<AgsSession> =>
  loginWithPlatformToken('google', { platform_token: googleIdToken })

export const linkGoogleAccount = async (session: AgsSession, googleIdToken: string): Promise<void> => {
  await axios.post(
    `${process.env.ACCELBYTE_BASE_URL}/iam/v3/public/namespaces/${process.env.ACCELBYTE_NAMESPACE}/users/me/platforms/google`,
    new URLSearchParams({ ticket: googleIdToken }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${session.accessToken}`
      }
    }
  )
}

export { createSdk }
