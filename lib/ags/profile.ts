import axios from 'axios'
import { Basic } from '@accelbyte/sdk-basic'
import { createSdk } from './sdk'

export interface AgsProfile {
  userId: string
  publicId: string
}

export const getMyProfile = async (accessToken: string): Promise<AgsProfile> => {
  const api = Basic.UserProfileApi(createSdk(accessToken))
  const { data } = await api.getUsersMeProfiles()
  return { userId: data.userId ?? '', publicId: data.publicId ?? '' }
}

export const createProfile = async (accessToken: string): Promise<AgsProfile> => {
  const api = Basic.UserProfileApi(createSdk(accessToken))
  const { data } = await api.createUserMeProfile({})
  return { userId: data.userId ?? '', publicId: data.publicId ?? '' }
}

export const getOrCreateProfile = async (accessToken: string): Promise<AgsProfile> => {
  try {
    return await getMyProfile(accessToken)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return await createProfile(accessToken)
    }
    throw err
  }
}
