import { Cloudsave } from '@accelbyte/sdk-cloudsave'
import { sdk } from './sdk'

const DISPLAY_NAME_KEY = 'displayName'
const LOCAL_STORAGE_KEY = 'displayName'

const adjectives = [
  'Cepat',
  'Gesit',
  'Lincah',
  'Tangguh',
  'Berani',
  'Hebat',
  'Jago',
  'Kilat',
  'Ulung',
  'Perkasa',
]

const nouns = [
  'Elang',
  'Harimau',
  'Garuda',
  'Serigala',
  'Cheetah',
  'Rajawali',
  'Komodo',
  'Merpati',
  'Singa',
  'Panther',
]

const randomOf = (list: string[]) => list[Math.floor(Math.random() * list.length)]

const generateDisplayName = () => `${randomOf(adjectives)} ${randomOf(nouns)}`

export const getOrCreateDisplayName = async (userId: string): Promise<string> => {
  const { PublicPlayerRecordApi } = Cloudsave
  const playerRecordApi = PublicPlayerRecordApi(sdk)

  try {
    const { data } = await playerRecordApi.getRecord_ByUserId_ByKey(userId, DISPLAY_NAME_KEY)
    const existingName = (data.value as { name?: string })?.name
    if (existingName) return existingName
  } catch {
    // no record yet, fall through to create one
  }

  const localName = localStorage.getItem(LOCAL_STORAGE_KEY)
  const displayName = localName || generateDisplayName()
  localStorage.setItem(LOCAL_STORAGE_KEY, displayName)

  try {
    await playerRecordApi.createRecord_ByUserId_ByKey(userId, DISPLAY_NAME_KEY, { name: displayName })
  } catch {
    // best-effort sync to cloud; localStorage fallback already set
  }

  return displayName
}
