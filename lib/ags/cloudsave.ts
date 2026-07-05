import { Cloudsave } from '@accelbyte/sdk-cloudsave'
import { createSdk } from './sdk'

const RECORDS_KEY = 'bestRecords'

export const getBestRecords = async (userId: string, accessToken: string): Promise<number[]> => {
  const { PublicPlayerRecordApi } = Cloudsave
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))

  try {
    const { data } = await playerRecordApi.getRecord_ByUserId_ByKey(userId, RECORDS_KEY)
    return (data.value as { records?: number[] })?.records ?? []
  } catch {
    return []
  }
}

export const saveBestRecords = async (userId: string, accessToken: string, records: number[]): Promise<void> => {
  const { PublicPlayerRecordApi } = Cloudsave
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))
  await playerRecordApi.createRecord_ByUserId_ByKey(userId, RECORDS_KEY, { records })
}
