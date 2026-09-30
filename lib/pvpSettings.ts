import { Language } from '@/constants/words'
import { readLocal, writeLocal } from '@/lib/queries/shared'
import { WordMode } from '@/lib/word-generators'

// A player's own race preference. Quick Match only pairs tickets carrying identical settings, and
// a match invite carries the inviter's settings, so this is also what an opponent ends up racing.
export interface PvpSettings {
  mode: WordMode
  duration: number
  language: Language
}

const STORAGE_KEY = 'pvpSettings'

export const DEFAULT_PVP_SETTINGS: PvpSettings = { mode: 'words', duration: 60, language: 'indonesian' }

export const readPvpSettings = (): PvpSettings => {
  try {
    return { ...DEFAULT_PVP_SETTINGS, ...readLocal<Partial<PvpSettings>>(STORAGE_KEY, {}) }
  } catch {
    return DEFAULT_PVP_SETTINGS
  }
}

export const writePvpSettings = (settings: PvpSettings) => {
  try {
    writeLocal(STORAGE_KEY, settings)
  } catch {
    // storage unavailable; the preference still applies for this visit
  }
}

export const describePvpSettings = (settings: PvpSettings) => `${settings.duration}s · ${settings.mode} · ${settings.language}`
