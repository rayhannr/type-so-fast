import React, { useEffect, useState, useMemo } from 'react'
import { indonesianWords, shuffleWord } from './constants/words'
import './tailwind.css'

import WordContainer from './components/WordContainer'
import Input from './components/Input'
import Result from './components/Result'

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

  const currentWord: string = useMemo(() => words[0], [words])
  const totalKeyStrokes: number = useMemo(() => correctKeystroke + wrongKeystroke, [correctKeystroke, wrongKeystroke])

  useEffect(() => {
    const shuffledWords = shuffleWord(indonesianWords, 350)
    setWords(shuffledWords)
  }, [])

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

  useEffect(() => {
    console.log(isInputCorrect)
  }, [isInputCorrect])

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
        const inputWord = inputText.slice(0, -1)
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

  return (
    <div className="font-inter p-8 md:p-14 lg:p-16">
      <WordContainer words={words} isInputCorrect={wordInput.length === 0 || isInputCorrect} />

      <div className="flex flex-row items-center justify-center">
        <Input value={wordInput} onChange={inputHandler} onKeyUp={keyUpHandler} />
        <div>
          <span>{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>

      <Result
        wpm={Math.round(correctKeystroke / 5)}
        correctKeystroke={correctKeystroke}
        wrongKeystroke={wrongKeystroke}
        accuracy={(correctKeystroke * 100 / (totalKeyStrokes + correction)).toFixed(2)}
        correctWords={correctWords}
        wrongWords={wrongWords} />
    </div>
  )
}

export default App
