import axios from 'axios'
import { createSdk } from './sdk'

interface DeviceTokenResponse {
  access_token: string
  refresh_token?: string
  user_id: string
}

export interface AgsSession {
  userId: string
  accessToken: string
}

export const loginWithDeviceId = async (deviceId: string): Promise<AgsSession> => {
  const { data } = await axios.post<DeviceTokenResponse>(
    `${process.env.ACCELBYTE_BASE_URL}/iam/v3/oauth/platforms/device/token`,
    new URLSearchParams({
      device_id: deviceId,
      create_headless: 'true',
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: { username: process.env.ACCELBYTE_CLIENT_ID!, password: '' },
    }
  )

  return { userId: data.user_id, accessToken: data.access_token }
}

export { createSdk }
