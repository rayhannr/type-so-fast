import type { Difficulty } from './botDifficulty'

export interface GameHistoryEntry {
  wpm: number
  timestamp: number
}

export interface StreakData {
  lastPlayedDate: string
  currentStreak: number
}

export interface ProgressionData {
  xp: number
  perfectStreak: number
  modesPlayed: string[]
  durationsPlayed: number[]
}

export const HISTORY_LIMIT = 20

const BASE_XP = 10
const XP_PER_WORD = 2
const XP_CURVE_FACTOR = 80

const xpForGame = (wpm: number, accuracy: number, wordsTyped: number): number =>
  BASE_XP + wordsTyped * XP_PER_WORD + Math.round(wpm * (accuracy / 100))

// quadratic curve: level 2 costs 80 XP total, level 5 costs 1280, level 10 costs 6480
const totalXpForLevel = (level: number): number => XP_CURVE_FACTOR * (level - 1) * (level - 1)

export const levelFromXp = (xp: number): number => Math.floor(Math.sqrt(Math.max(0, xp) / XP_CURVE_FACTOR)) + 1

export const levelProgress = (xp: number): { level: number; current: number; required: number } => {
  const level = levelFromXp(xp)
  const floor = totalXpForLevel(level)
  return { level, current: xp - floor, required: totalXpForLevel(level + 1) - floor }
}

interface CompletedGame {
  wpm: number
  accuracy: number
  wordsTyped: number
  mode: string
  duration: number
}

export const advanceProgression = (
  previous: ProgressionData | null,
  game: CompletedGame
): { progression: ProgressionData; earnedXp: number; leveledUp: boolean } => {
  const base = previous ?? { xp: 0, perfectStreak: 0, modesPlayed: [], durationsPlayed: [] }
  const earnedXp = xpForGame(game.wpm, game.accuracy, game.wordsTyped)
  const xp = base.xp + earnedXp
  return {
    progression: {
      xp,
      perfectStreak: game.accuracy >= 100 ? (base.perfectStreak ?? 0) + 1 : 0,
      modesPlayed: (base.modesPlayed ?? []).includes(game.mode) ? base.modesPlayed : [...(base.modesPlayed ?? []), game.mode],
      durationsPlayed: (base.durationsPlayed ?? []).includes(game.duration)
        ? base.durationsPlayed
        : [...(base.durationsPlayed ?? []), game.duration],
    },
    earnedXp,
    leveledUp: levelFromXp(xp) > levelFromXp(base.xp),
  }
}

export interface PvcData {
  easyWins: number
  mediumWins: number
  hardWins: number
  legendWins: number
  legendWinStreak: number
}

interface PvcRoundResult {
  difficulty: Difficulty
  won: boolean
}

export const advancePvc = (previous: PvcData | null, result: PvcRoundResult): PvcData => {
  const base = previous ?? { easyWins: 0, mediumWins: 0, hardWins: 0, legendWins: 0, legendWinStreak: 0 }

  let legendWinStreak = base.legendWinStreak
  if (result.difficulty === 'legend') legendWinStreak = result.won ? base.legendWinStreak + 1 : 0

  return {
    easyWins: base.easyWins + (result.won && result.difficulty === 'easy' ? 1 : 0),
    mediumWins: base.mediumWins + (result.won && result.difficulty === 'medium' ? 1 : 0),
    hardWins: base.hardWins + (result.won && result.difficulty === 'hard' ? 1 : 0),
    legendWins: base.legendWins + (result.won && result.difficulty === 'legend' ? 1 : 0),
    legendWinStreak,
  }
}

export interface PvpData {
  wins: number
  losses: number
  ties: number
  winStreak: number
}

interface PvpRoundResult {
  outcome: 'win' | 'lose' | 'tie'
}

export const advancePvp = (previous: PvpData | null, result: PvpRoundResult): PvpData => {
  const base = previous ?? { wins: 0, losses: 0, ties: 0, winStreak: 0 }

  return {
    wins: base.wins + (result.outcome === 'win' ? 1 : 0),
    losses: base.losses + (result.outcome === 'lose' ? 1 : 0),
    ties: base.ties + (result.outcome === 'tie' ? 1 : 0),
    winStreak: result.outcome === 'win' ? base.winStreak + 1 : 0,
  }
}

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
