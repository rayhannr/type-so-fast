import React, { useEffect, useState, useMemo } from 'react'
import { indonesianWords, shuffleWord } from './constants/words'
import './tailwind.css'

import WordContainer from './components/WordContainer'
import Input from './components/Input'
import Result from './components/Result'
import Timer from './components/Timer'
import RestartButton from './components/RestartButton'

const App: React.FC = () => {
  const [words, setWords] = useState<string[]>([])
  const [wordInput, setWordInput] = useState<string>('')
  const [isInputCorrect, setIsInputCorrect] = useState<boolean>(true)

  const [correctKeystroke, setCorrectKeystroke] = useState<number>(0)
  const [wrongKeystroke, setWrongKeystroke] = useState<number>(0)
  const [correction, setCorrection] = useState<number>(0)

  const [correctWords, setCorrectWords] = useState<number>(0)
  const [wrongWords, setWrongWords] = useState<number>(0)

  const [timer, setTimer] = useState<number>(60)

  const numberOfWords: number = useMemo(() => 400, [])
  const currentWord: string = useMemo(() => words[0], [words])
  const totalKeyStrokes: number = useMemo(() => correctKeystroke + wrongKeystroke, [correctKeystroke, wrongKeystroke])

  useEffect(() => {
    const shuffledWords: string[] = shuffleWord(indonesianWords, numberOfWords)
    setWords(shuffledWords)
  }, [numberOfWords])

  const timerHandler = () => {
    let timesLeft: number = timer
    const interval = setInterval(() => {
      timesLeft -= 1
      setTimer(prevTimer => prevTimer - 1)

      if (timesLeft <= 0) {
        clearInterval(interval)
      }
    }, 1000)
  }

  const inputHandler = (inputText: string) => {
    setWordInput(inputText)

    if (inputText.endsWith(' ')) {
      setWordInput('')
    }

    if (inputText.trim().length > 0) {
      //in if check the inputtext should be trimmed since when checking happens, it might contains space at the end
      if (currentWord && inputText.trim() !== currentWord.slice(0, inputText.length)) {
        setIsInputCorrect(false)
      } else {
        setIsInputCorrect(true)
      }

      if (inputText.endsWith(' ')) {
        const inputWord: string = inputText.slice(0, -1)
        if (inputWord === currentWord) {
          setCorrectWords(prev => prev + 1)
        } else {
          setWrongWords(prev => prev + 1)
        }

        setWords(prevWords => prevWords.slice(1))
      }
    }
  }

  const keyUpHandler = (key: string) => {
    //start timer when user first enter key
    if (totalKeyStrokes === 0) {
      timerHandler()
    }

    if (key.length === 1 && key !== " ") {
      if (isInputCorrect) {
        setCorrectKeystroke(prev => prev + 1)
      } else {
        setWrongKeystroke(prev => prev + 1)
      }
    }

    if (key === 'Backspace') {
      setCorrection(prev => prev + 1)
    }
  }

  const restartHandler = () => {
    setWords(shuffleWord(indonesianWords, numberOfWords))
    setWordInput('')
    setIsInputCorrect(true)
    
    setCorrectKeystroke(0)
    setWrongKeystroke(0)
    setCorrection(0)

    setCorrectWords(0)
    setWrongWords(0)
    setTimer(60)
  }

  return (
    <div className="font-inter p-8 md:p-14 lg:p-16">
      <h1 className="text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-blue-600 font-bold text-3xl md:text-4xl lg:text-6xl">TypeSoFast!</h1>
      <h2 className="font-medium text-lg text-center text-gray-500 mt-2">How fast can you type?</h2>
      <h3 className="text-center text-gray-400 mt-1 mb-5">
        A simple <a href="https://10fastfingers.com" target="_blank" rel="noreferrer" className="hover:text-gray-500 cursor-pointer">10fastfingers </a>
         clone for you to test your speed to type in Indonesian
        </h3>
      <WordContainer words={words} isInputCorrect={isInputCorrect || wordInput.length === 0} />

      <div className="flex flex-row items-center justify-center mt-8">
        <Input 
          value={wordInput}
          disabled={timer === 0} 
          onChange={inputHandler} 
          onKeyUp={keyUpHandler} />
        <Timer timer={timer} />
        <RestartButton onClick={restartHandler} />
      </div>

      {!timer &&
        <Result
          wpm={Math.round(correctKeystroke / 5)}
          correctKeystroke={correctKeystroke}
          wrongKeystroke={wrongKeystroke}
          accuracy={(correctKeystroke * 100 / (totalKeyStrokes + correction)).toFixed(2)}
          correctWords={correctWords}
          wrongWords={wrongWords} />
      }
    </div>
  )
}

export default App
