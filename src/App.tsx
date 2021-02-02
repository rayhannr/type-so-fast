import React, { useEffect, useState } from 'react'
import { indonesianWords, shuffleWord } from './constants/words'
import './tailwind.css'

import WordContainer from './components/WordContainer'

const App: React.FC = () => {
  const [words, setWords] = useState<string[]>([])
  useEffect(() => {
    const shuffledWords = shuffleWord(indonesianWords, 300)
    setWords(shuffledWords)
  }, [])

  return (
    <div className="font-inter">
      <WordContainer words={words} />
      <p>hehe</p>
    </div>
  )
}

export default App
