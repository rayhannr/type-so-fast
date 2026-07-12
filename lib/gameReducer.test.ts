import { describe, expect, it } from 'vitest'
import { createInitialState, gameReducer, type GameState } from './gameReducer'

const baseState = (overrides: Partial<GameState> = {}): GameState => ({
  ...createInitialState(['hello', 'world'], 60),
  ...overrides
})

describe('INPUT_CHANGE', () => {
  it('marks input correct while it matches a prefix of the current word', () => {
    const state = baseState()
    const next = gameReducer(state, { type: 'INPUT_CHANGE', value: 'hel', currentWord: 'hello' })
    expect(next.isInputCorrect).toBe(true)
  })

  it('marks input incorrect as soon as the first character diverges', () => {
    const state = baseState()
    const next = gameReducer(state, { type: 'INPUT_CHANGE', value: 'x', currentWord: 'hello' })
    expect(next.isInputCorrect).toBe(false)
  })

  it('marks input incorrect when a later character diverges', () => {
    const state = baseState()
    const next = gameReducer(state, { type: 'INPUT_CHANGE', value: 'helz', currentWord: 'hello' })
    expect(next.isInputCorrect).toBe(false)
  })

  it('does not commit the word while typing without a trailing space (backspacing case)', () => {
    const state = baseState()
    const next = gameReducer(state, { type: 'INPUT_CHANGE', value: 'hell', currentWord: 'hello' })
    expect(next.words).toEqual(['hello', 'world'])
    expect(next.wordInput).toBe('hell')
    expect(next.wordStats).toEqual([])
  })

  it('commits the word only once the value ends with a trailing space', () => {
    const state = baseState()
    const next = gameReducer(state, { type: 'INPUT_CHANGE', value: 'hello ', currentWord: 'hello' })
    expect(next.words).toEqual(['world'])
    expect(next.wordInput).toBe('')
  })

  it('increments correctWords and not wrongWords on an exact match', () => {
    const state = baseState()
    const next = gameReducer(state, { type: 'INPUT_CHANGE', value: 'hello ', currentWord: 'hello' })
    expect(next.correctWords).toBe(1)
    expect(next.wrongWords).toBe(0)
  })

  it('increments wrongWords and not correctWords on a mismatched submission', () => {
    const state = baseState()
    const next = gameReducer(state, { type: 'INPUT_CHANGE', value: 'helzo ', currentWord: 'hello' })
    expect(next.correctWords).toBe(0)
    expect(next.wrongWords).toBe(1)
  })

  it('computes wordStats correct/attempted counts when input is shorter than the word', () => {
    const state = baseState()
    const next = gameReducer(state, { type: 'INPUT_CHANGE', value: 'hel ', currentWord: 'hello' })
    // 'hel' matches the first 3 chars of 'hello'; attempted is the longer of the two lengths (5)
    expect(next.wordStats).toEqual([{ word: 'hello', correct: 3, attempted: 5 }])
  })

  it('computes wordStats correct/attempted counts when input is longer than the word', () => {
    const state = baseState()
    const next = gameReducer(state, { type: 'INPUT_CHANGE', value: 'helloooo ', currentWord: 'hello' })
    // all 5 overlapping chars match; attempted is the longer input length (8)
    expect(next.wordStats).toEqual([{ word: 'hello', correct: 5, attempted: 8 }])
  })

  it('computes wordStats correct count of 0 when the first character is wrong', () => {
    const state = baseState()
    const next = gameReducer(state, { type: 'INPUT_CHANGE', value: 'xello ', currentWord: 'hello' })
    expect(next.wordStats[0].correct).toBe(4)
  })

  it('handles an empty word list without throwing and still records the attempt as wrong', () => {
    const state = baseState({ words: [] })
    const next = gameReducer(state, { type: 'INPUT_CHANGE', value: 'test ', currentWord: '' })
    expect(next.words).toEqual([])
    // 'test' can never match an empty currentWord, so it counts as a wrong word
    expect(next.wrongWords).toBe(1)
    expect(next.correctWords).toBe(0)
  })
})

describe('KEYSTROKE', () => {
  it('lowercases the missed character before storing it in missMap', () => {
    const state = baseState()
    const next = gameReducer(state, { type: 'KEYSTROKE', correct: false, missedChar: 'A' })
    expect(next.missMap).toEqual({ a: 1 })
  })

  it('accumulates counts for repeated misses of the same character', () => {
    let state = baseState()
    state = gameReducer(state, { type: 'KEYSTROKE', correct: false, missedChar: 'a' })
    state = gameReducer(state, { type: 'KEYSTROKE', correct: false, missedChar: 'A' })
    expect(state.missMap).toEqual({ a: 2 })
  })

  it('tracks distinct missed characters separately', () => {
    let state = baseState()
    state = gameReducer(state, { type: 'KEYSTROKE', correct: false, missedChar: 'a' })
    state = gameReducer(state, { type: 'KEYSTROKE', correct: false, missedChar: 'b' })
    expect(state.missMap).toEqual({ a: 1, b: 1 })
  })
})

describe('TICK', () => {
  it('does not take a wpm sample when elapsed is not a multiple of 5', () => {
    // duration 60, timer starts at 56 -> after tick timer=55, elapsed=5... use elapsed=4 case instead
    const state = baseState({ timer: 57, duration: 60, correctKeystroke: 10 })
    const next = gameReducer(state, { type: 'TICK' })
    // elapsed = 60 - 56 = 4
    expect(next.timer).toBe(56)
    expect(next.wpmSamples).toEqual([])
  })

  it('takes a wpm sample exactly when elapsed hits 5', () => {
    const state = baseState({ timer: 56, duration: 60, correctKeystroke: 25 })
    const next = gameReducer(state, { type: 'TICK' })
    // elapsed = 60 - 55 = 5
    expect(next.wpmSamples).toHaveLength(1)
    expect(next.wpmSamples[0].elapsed).toBe(5)
  })

  it('takes another wpm sample at elapsed=10', () => {
    const state = baseState({ timer: 51, duration: 60, correctKeystroke: 50, wpmSamples: [{ elapsed: 5, wpm: 12 }] })
    const next = gameReducer(state, { type: 'TICK' })
    // elapsed = 60 - 50 = 10
    expect(next.wpmSamples).toHaveLength(2)
    expect(next.wpmSamples[1].elapsed).toBe(10)
  })

  it('computes wpm as round(correctKeystroke * 12 / elapsed) at a known sample point', () => {
    const state = baseState({ timer: 56, duration: 60, correctKeystroke: 25 })
    const next = gameReducer(state, { type: 'TICK' })
    // elapsed = 5; wpm = round(25 * 12 / 5) = round(60) = 60
    expect(next.wpmSamples[0].wpm).toBe(60)
  })

  it('decrements the timer every tick regardless of sampling', () => {
    const state = baseState({ timer: 30, duration: 60 })
    const next = gameReducer(state, { type: 'TICK' })
    expect(next.timer).toBe(29)
  })
})

describe('RESTART', () => {
  it('resets state to a fresh initial state with the new words and duration', () => {
    const dirty = baseState({
      correctWords: 5,
      wrongWords: 2,
      wpmSamples: [{ elapsed: 5, wpm: 40 }],
      missMap: { a: 3 },
      wordInput: 'abc'
    })
    const next = gameReducer(dirty, { type: 'RESTART', words: ['new', 'words'], duration: 30 })
    expect(next).toEqual(createInitialState(['new', 'words'], 30))
  })
})
