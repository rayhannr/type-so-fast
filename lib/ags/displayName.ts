import { Cloudsave } from '@accelbyte/sdk-cloudsave'
import { fakerEN } from '@faker-js/faker'
import { createSdk } from './sdk'

const DISPLAY_NAME_KEY = 'displayName'

const generateDisplayName = () =>
  `${fakerEN.word.adjective()} ${fakerEN.word.noun()}`

export const getOrCreateDisplayName = async (userId: string, accessToken: string, localNameHint?: string): Promise<string> => {
  const { PublicPlayerRecordApi } = Cloudsave
  const playerRecordApi = PublicPlayerRecordApi(createSdk(accessToken))

  try {
    const { data } = await playerRecordApi.getRecord_ByUserId_ByKey(userId, DISPLAY_NAME_KEY)
    const existingName = (data.value as { name?: string })?.name
    if (existingName) return existingName
  } catch {
    // no record yet, fall through to create one
  }

  const displayName = localNameHint || generateDisplayName()

  try {
    await playerRecordApi.createRecord_ByUserId_ByKey(userId, DISPLAY_NAME_KEY, { name: displayName })
  } catch {
    // best-effort sync to cloud
  }

  return displayName
}
