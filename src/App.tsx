import React, { useEffect, useState, useMemo } from 'react'
import { indonesianWords, shuffleWord } from './constants/words'
import './tailwind.css'

import WordContainer from './components/WordContainer'
import Input from './components/Input'

const App: React.FC = () => {
  const [words, setWords] = useState<string[]>([])
  const [wordInput, setWordInput] = useState<string>('')
  const [isInputCorrect, setIsInputCorrect] = useState<boolean>(true)
  const [correctKeystroke, setCorrectKeystroke] = useState<number>(0)
  const [wrongKeystroke, setWrongKeystroke] = useState<number>(0)

  const currentWord = useMemo(() => words[0], [words])

  useEffect(() => {
    const shuffledWords = shuffleWord(indonesianWords, 300)
    setWords(shuffledWords)
  }, [])

  useEffect(() => {
    console.log(`correct: ${correctKeystroke}`)
    console.log(`wrong: ${wrongKeystroke}`)
  }, [wrongKeystroke, correctKeystroke])

  const inputHandler = (inputText: string) => {
    setWordInput(inputText)

    if (inputText.endsWith(' ')) {
      setWordInput('')
    }

    if (inputText.trim().length > 0) {
      if (inputText.endsWith(' ')) {
        setWords(prevWords => prevWords.slice(1))
      }

      if (inputText !== currentWord.slice(0, inputText.length)) {
        setIsInputCorrect(false)
      } else {
        setIsInputCorrect(true)
      }
    }
  }

  const keyUpHandler = (key: string) => {
    if(key.length === 1 && key !== " "){
      if(isInputCorrect){
        setCorrectKeystroke(prev => prev + 1)
      } else {
        setWrongKeystroke(prev => prev + 1)
      }
    }
  }

  return (
    <div className="font-inter p-8 md:p-14 lg:p-16">
      <WordContainer words={words} isInputCorrect={wordInput.length === 0 || isInputCorrect} />
      <Input value={wordInput} onChange={inputHandler} onKeyUp={keyUpHandler} />
    </div>
  )
}

export default App
