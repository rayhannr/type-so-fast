import { indonesianWords, shuffleWord } from '@/constants/words'
import { indonesianQuotes } from '@/constants/quotes'

export type WordMode = 'words' | 'numbers' | 'punctuation' | 'quotes'

export const WORD_MODES: WordMode[] = ['words', 'numbers', 'punctuation', 'quotes']

const numberWords = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh']

const randomNumberToken = (): string => {
  if (Math.random() < 0.5) return numberWords[Math.floor(Math.random() * numberWords.length)]
  const digits = 1 + Math.floor(Math.random() * 3)
  const min = 10 ** (digits - 1)
  const max = 10 ** digits - 1
  return String(min + Math.floor(Math.random() * (max - min + 1)))
}

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1)

const withPunctuation = (words: string[]): string[] => {
  let capitalizeNext = true
  return words.map((word) => {
    let result = capitalizeNext ? capitalize(word) : word
    capitalizeNext = false

    const roll = Math.random()
    if (roll < 0.08) {
      result = `'${result}'`
    } else if (roll < 0.18) {
      result += '.'
      capitalizeNext = true
    } else if (roll < 0.32) {
      result += ','
    }

    return result
  })
}

export const generateWords = (mode: WordMode, count: number): string[] => {
  switch (mode) {
    case 'numbers':
      return Array.from({ length: count }, randomNumberToken)
    case 'punctuation':
      return withPunctuation(shuffleWord(indonesianWords, count))
    case 'quotes': {
      const quote = indonesianQuotes[Math.floor(Math.random() * indonesianQuotes.length)]
      return quote.split(' ').filter(Boolean)
    }
    case 'words':
    default:
      return shuffleWord(indonesianWords, count)
  }
}
