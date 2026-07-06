export interface GameHistoryEntry {
  wpm: number
  timestamp: number
}

export interface StreakData {
  lastPlayedDate: string
  currentStreak: number
}

export const HISTORY_LIMIT = 20

// local calendar date, so a "day" matches what the player sees on their clock
const toDateString = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const advanceStreak = (previous: StreakData | null, now: Date): StreakData => {
  const today = toDateString(now)
  if (!previous?.lastPlayedDate) return { lastPlayedDate: today, currentStreak: 1 }
  if (previous.lastPlayedDate === today) return previous

  const yesterday = toDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000))
  return {
    lastPlayedDate: today,
    currentStreak: previous.lastPlayedDate === yesterday ? previous.currentStreak + 1 : 1,
  }
}
