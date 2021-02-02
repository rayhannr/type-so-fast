import React, { useEffect } from 'react'
import { words, shuffleWord } from './constants/words'
import './tailwind.css'

const App: React.FC = () => {
  useEffect(() => {
    const word = shuffleWord(words, 300)
    console.log(word)
  }, [])

  return (
    <p className="text-gray-900 font-bold">Kont</p>
  )
}

export default App
