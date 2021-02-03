import React, { useEffect, useState } from 'react'
import { indonesianWords, shuffleWord } from './constants/words'
import './tailwind.css'

import WordContainer from './components/WordContainer'
import Input from './components/Input'

const App: React.FC = () => {
  const [words, setWords] = useState<string[]>([])
  const [wordInput, setWordInput] = useState<string>('')

  useEffect(() => {
    const shuffledWords = shuffleWord(indonesianWords, 300)
    setWords(shuffledWords)
  }, [])

  useEffect(() => {
    console.log(wordInput)
  }, [wordInput])

  return (
    <div className="font-inter p-8 md:p-14 lg:p-16">
      <WordContainer words={words} />
      <Input value={wordInput} onChange={(input) => setWordInput(input)} />
    </div>
  )
}

export default App
