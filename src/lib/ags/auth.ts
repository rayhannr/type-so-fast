import axios from 'axios'
import { SdkDevice } from '@accelbyte/sdk'
import { sdk } from './sdk'

interface DeviceTokenResponse {
  access_token: string
  refresh_token?: string
  user_id: string
}

export interface AgsSession {
  userId: string
  accessToken: string
}

const clientId = import.meta.env.VITE_ACCELBYTE_CLIENT_ID
const baseURL = import.meta.env.VITE_ACCELBYTE_BASE_URL

export const loginWithDeviceId = async (): Promise<AgsSession> => {
  const deviceId = SdkDevice.getDeviceId()

  const { data } = await axios.post<DeviceTokenResponse>(
    `${baseURL}/iam/v3/oauth/token`,
    new URLSearchParams({
      grant_type: 'device_id',
      client_id: clientId,
      device_id: deviceId,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  sdk.setToken({ accessToken: data.access_token, refreshToken: data.refresh_token })

  return { userId: data.user_id, accessToken: data.access_token }
}
