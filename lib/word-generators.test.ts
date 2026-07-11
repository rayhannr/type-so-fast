import { describe, expect, it } from 'vitest'
import { wordsByLanguage } from '@/constants/words'
import { generateWords } from './word-generators'

const NUMBER_WORDS = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh']

describe('generateWords: numbers mode', () => {
  it('produces the requested count of tokens', () => {
    const words = generateWords('numbers', 20)
    expect(words).toHaveLength(20)
  })

  it('produces only tokens that are known number words or 1-3 digit numeric strings', () => {
    // run many iterations since the digit-word split is randomized
    for (let i = 0; i < 50; i++) {
      const words = generateWords('numbers', 20)
      for (const token of words) {
        const isKnownNumberWord = NUMBER_WORDS.includes(token)
        const isNumericInRange = /^\d{1,3}$/.test(token)
        expect(isKnownNumberWord || isNumericInRange).toBe(true)
      }
    }
  })

  it('never produces a numeric token with more than 3 digits or a leading-zero out-of-range value', () => {
    for (let i = 0; i < 50; i++) {
      const words = generateWords('numbers', 20)
      for (const token of words) {
        if (/^\d+$/.test(token)) {
          const value = Number(token)
          expect(value).toBeGreaterThanOrEqual(1)
          expect(value).toBeLessThanOrEqual(999)
        }
      }
    }
  })
})

describe('generateWords: words mode', () => {
  it('defaults to the Indonesian word list when no language is given', () => {
    const words = generateWords('words', 15)
    expect(words).toHaveLength(15)
    for (const word of words) {
      expect(wordsByLanguage.indonesian).toContain(word)
    }
  })

  it('draws from the Indonesian word list when explicitly requested', () => {
    const words = generateWords('words', 15, 'indonesian')
    expect(words).toHaveLength(15)
    for (const word of words) {
      expect(wordsByLanguage.indonesian).toContain(word)
    }
  })

  it('draws from the English word list when requested', () => {
    const words = generateWords('words', 15, 'english')
    expect(words).toHaveLength(15)
    for (const word of words) {
      expect(wordsByLanguage.english).toContain(word)
    }
  })
})

describe('generateWords: default mode (no mode string matched)', () => {
  it('behaves the same as "words" mode, drawing from the known Indonesian word list', () => {
    // cast bypasses the WordMode type to exercise the switch statement's default branch
    const words = generateWords('unknown' as never, 15)
    expect(words).toHaveLength(15)
    for (const word of words) {
      expect(wordsByLanguage.indonesian).toContain(word)
    }
  })
})
