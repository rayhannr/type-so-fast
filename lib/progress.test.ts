import { describe, expect, it } from 'vitest'
import { advancePvc, advancePvp, advanceProgression, advanceStreak, levelFromXp, levelProgress } from './progress'

describe('levelFromXp', () => {
  it('starts at level 1 with zero xp', () => {
    expect(levelFromXp(0)).toBe(1)
  })

  it('stays at level 1 just below the level-2 threshold (80 xp)', () => {
    expect(levelFromXp(79)).toBe(1)
  })

  it('reaches level 2 exactly at the 80 xp threshold', () => {
    expect(levelFromXp(80)).toBe(2)
  })

  it('stays at level 2 just below the level-3 threshold (320 xp)', () => {
    expect(levelFromXp(319)).toBe(2)
  })

  it('reaches level 3 exactly at the 320 xp threshold', () => {
    expect(levelFromXp(320)).toBe(3)
  })
})

describe('levelProgress', () => {
  it('reports zero progress into the current level right at its threshold', () => {
    const progress = levelProgress(80)
    expect(progress.level).toBe(2)
    expect(progress.current).toBe(0)
  })

  it('reports the xp required to reach the next level', () => {
    const progress = levelProgress(80)
    // level 3 threshold (320) minus level 2 threshold (80) = 240
    expect(progress.required).toBe(240)
  })
})

describe('advanceProgression: earnedXp', () => {
  it('awards base + per-word + wpm*accuracy-derived xp using an independently computed expectation', () => {
    const wpm = 50
    const accuracy = 90
    const wordsTyped = 8
    // hand-computed: 10 + 8*2 + round(50 * 90/100) = 10 + 16 + round(45) = 71
    const expectedEarnedXp = 71
    const result = advanceProgression(null, { wpm, accuracy, wordsTyped, mode: 'words', duration: 30 })
    expect(result.earnedXp).toBe(expectedEarnedXp)
  })
})

describe('advanceProgression: perfectStreak', () => {
  it('increments the perfect streak at exactly 100% accuracy', () => {
    const previous = { xp: 0, perfectStreak: 2, modesPlayed: [], durationsPlayed: [] }
    const result = advanceProgression(previous, { wpm: 40, accuracy: 100, wordsTyped: 5, mode: 'words', duration: 30 })
    expect(result.progression.perfectStreak).toBe(3)
  })

  it('resets the perfect streak to 0 at 99.99% accuracy', () => {
    const previous = { xp: 0, perfectStreak: 2, modesPlayed: [], durationsPlayed: [] }
    const result = advanceProgression(previous, { wpm: 40, accuracy: 99.99, wordsTyped: 5, mode: 'words', duration: 30 })
    expect(result.progression.perfectStreak).toBe(0)
  })
})

describe('advanceProgression: modesPlayed / durationsPlayed dedupe', () => {
  it('does not duplicate a mode already recorded', () => {
    const previous = { xp: 0, perfectStreak: 0, modesPlayed: ['words'], durationsPlayed: [] }
    const result = advanceProgression(previous, { wpm: 40, accuracy: 90, wordsTyped: 5, mode: 'words', duration: 30 })
    expect(result.progression.modesPlayed).toEqual(['words'])
  })

  it('adds a new mode not yet recorded', () => {
    const previous = { xp: 0, perfectStreak: 0, modesPlayed: ['words'], durationsPlayed: [] }
    const result = advanceProgression(previous, { wpm: 40, accuracy: 90, wordsTyped: 5, mode: 'numbers', duration: 30 })
    expect(result.progression.modesPlayed).toEqual(['words', 'numbers'])
  })

  it('does not duplicate a duration already recorded', () => {
    const previous = { xp: 0, perfectStreak: 0, modesPlayed: [], durationsPlayed: [30] }
    const result = advanceProgression(previous, { wpm: 40, accuracy: 90, wordsTyped: 5, mode: 'words', duration: 30 })
    expect(result.progression.durationsPlayed).toEqual([30])
  })
})

describe('advanceProgression: leveledUp boundary', () => {
  it('reports leveledUp when the earned xp crosses the next level threshold', () => {
    // previous xp 70 + earnedXp of exactly 10 (0 words, 0 wpm, 0 accuracy) = 80, the level-2 threshold
    const previous = { xp: 70, perfectStreak: 0, modesPlayed: [], durationsPlayed: [] }
    const result = advanceProgression(previous, { wpm: 0, accuracy: 0, wordsTyped: 0, mode: 'words', duration: 30 })
    expect(result.leveledUp).toBe(true)
  })

  it('reports leveledUp as false when the earned xp falls just short of the next level threshold', () => {
    // previous xp 69 + earnedXp of exactly 10 = 79, one short of the level-2 threshold
    const previous = { xp: 69, perfectStreak: 0, modesPlayed: [], durationsPlayed: [] }
    const result = advanceProgression(previous, { wpm: 0, accuracy: 0, wordsTyped: 0, mode: 'words', duration: 30 })
    expect(result.leveledUp).toBe(false)
  })
})

describe('advancePvc', () => {
  it('increments only the win counter matching the round difficulty', () => {
    const previous = { easyWins: 1, mediumWins: 1, hardWins: 1, legendWins: 1, legendWinStreak: 0 }
    const result = advancePvc(previous, { difficulty: 'medium', won: true })
    expect(result).toMatchObject({ easyWins: 1, mediumWins: 2, hardWins: 1, legendWins: 1 })
  })

  it('does not increment any win counter on a loss', () => {
    const previous = { easyWins: 1, mediumWins: 1, hardWins: 1, legendWins: 1, legendWinStreak: 0 }
    const result = advancePvc(previous, { difficulty: 'medium', won: false })
    expect(result).toMatchObject({ easyWins: 1, mediumWins: 1, hardWins: 1, legendWins: 1 })
  })

  it('increments legendWinStreak on a legend win', () => {
    const previous = { easyWins: 0, mediumWins: 0, hardWins: 0, legendWins: 0, legendWinStreak: 2 }
    const result = advancePvc(previous, { difficulty: 'legend', won: true })
    expect(result.legendWinStreak).toBe(3)
  })

  it('resets legendWinStreak to 0 on a legend loss', () => {
    const previous = { easyWins: 0, mediumWins: 0, hardWins: 0, legendWins: 0, legendWinStreak: 5 }
    const result = advancePvc(previous, { difficulty: 'legend', won: false })
    expect(result.legendWinStreak).toBe(0)
  })

  it('leaves legendWinStreak untouched by non-legend rounds', () => {
    const previous = { easyWins: 0, mediumWins: 0, hardWins: 0, legendWins: 0, legendWinStreak: 4 }
    const result = advancePvc(previous, { difficulty: 'easy', won: false })
    expect(result.legendWinStreak).toBe(4)
  })
})

describe('advancePvp', () => {
  it('increments wins on a win outcome', () => {
    const previous = { wins: 0, losses: 0, ties: 0, winStreak: 0 }
    const result = advancePvp(previous, { outcome: 'win' })
    expect(result).toMatchObject({ wins: 1, losses: 0, ties: 0 })
  })

  it('increments losses on a lose outcome', () => {
    const previous = { wins: 0, losses: 0, ties: 0, winStreak: 0 }
    const result = advancePvp(previous, { outcome: 'lose' })
    expect(result).toMatchObject({ wins: 0, losses: 1, ties: 0 })
  })

  it('increments ties on a tie outcome', () => {
    const previous = { wins: 0, losses: 0, ties: 0, winStreak: 0 }
    const result = advancePvp(previous, { outcome: 'tie' })
    expect(result).toMatchObject({ wins: 0, losses: 0, ties: 1 })
  })

  it('increments winStreak on a win', () => {
    const previous = { wins: 2, losses: 0, ties: 0, winStreak: 2 }
    const result = advancePvp(previous, { outcome: 'win' })
    expect(result.winStreak).toBe(3)
  })

  it('resets winStreak to 0 on a loss', () => {
    const previous = { wins: 2, losses: 0, ties: 0, winStreak: 3 }
    const result = advancePvp(previous, { outcome: 'lose' })
    expect(result.winStreak).toBe(0)
  })

  it('resets winStreak to 0 on a tie', () => {
    const previous = { wins: 2, losses: 0, ties: 0, winStreak: 3 }
    const result = advancePvp(previous, { outcome: 'tie' })
    expect(result.winStreak).toBe(0)
  })
})

describe('advanceStreak', () => {
  it('starts the streak at 1 on the very first play', () => {
    const now = new Date(2026, 6, 8)
    const result = advanceStreak(null, now)
    expect(result).toEqual({ lastPlayedDate: '2026-07-08', currentStreak: 1 })
  })

  it('is a no-op when playing again on the same calendar day', () => {
    const previous = { lastPlayedDate: '2026-07-08', currentStreak: 5 }
    const now = new Date(2026, 6, 8, 23, 59)
    const result = advanceStreak(previous, now)
    expect(result).toBe(previous)
  })

  it('increments the streak when playing on the very next calendar day', () => {
    const previous = { lastPlayedDate: '2026-07-07', currentStreak: 3 }
    const now = new Date(2026, 6, 8)
    const result = advanceStreak(previous, now)
    expect(result).toEqual({ lastPlayedDate: '2026-07-08', currentStreak: 4 })
  })

  it('resets the streak to 1 after a gap of 2 or more days', () => {
    const previous = { lastPlayedDate: '2026-07-05', currentStreak: 3 }
    const now = new Date(2026, 6, 8)
    const result = advanceStreak(previous, now)
    expect(result).toEqual({ lastPlayedDate: '2026-07-08', currentStreak: 1 })
  })
})
