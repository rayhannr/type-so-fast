import { wordsByLanguage, shuffleWord, Language } from '@/constants/words'

export type WordMode = 'words' | 'numbers' | 'punctuation'

export const WORD_MODES: WordMode[] = ['words', 'numbers', 'punctuation']

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

export const generateWords = (mode: WordMode, count: number, language: Language = 'indonesian'): string[] => {
  switch (mode) {
    case 'numbers':
      return Array.from({ length: count }, randomNumberToken)
    case 'punctuation':
      return withPunctuation(shuffleWord(wordsByLanguage[language], count))
    case 'words':
    default:
      return shuffleWord(wordsByLanguage[language], count)
  }
}
