import React, { useEffect, useState, useMemo, useRef } from 'react'
import { indonesianWords, shuffleWord } from './constants/words'
import './tailwind.css'

import Heading from './components/Heading'
import WordContainer from './components/WordContainer'
import Input from './components/Input'
import Result from './components/Result'
import Timer from './components/Timer'
import RestartButton from './components/RestartButton'
import Records from './components/Records'

const App: React.FC = () => {
  const [words, setWords] = useState<string[]>([])
  const [wordInput, setWordInput] = useState<string>('')
  const [isInputCorrect, setIsInputCorrect] = useState<boolean>(true)

  const [correctKeystroke, setCorrectKeystroke] = useState<number>(0)
  const [wrongKeystroke, setWrongKeystroke] = useState<number>(0)
  const [correction, setCorrection] = useState<number>(0)

  const [correctWords, setCorrectWords] = useState<number>(0)
  const [wrongWords, setWrongWords] = useState<number>(0)
  const [records, setRecords] = useState<number[]>([])

  const [timer, setTimer] = useState<number>(60)

  const numberOfWords: number = useMemo(() => 400, [])
  const currentWord: string = useMemo(() => words[0], [words])
  const totalKeyStrokes: number = useMemo(() => correctKeystroke + wrongKeystroke, [correctKeystroke, wrongKeystroke])

  const intervalRef = useRef<any>(null)

  useEffect(() => {
    const shuffledWords: string[] = shuffleWord(indonesianWords, numberOfWords)
    setWords(shuffledWords)
  }, [numberOfWords])

  useEffect(() => {
    const userRecords = localStorage.getItem('bestRecords')
    const records = userRecords ? JSON.parse(userRecords) : [] as number[]
    setRecords(records)
  }, [])

  useEffect(() => {
    if (timer === 0) {
      const userRecords = localStorage.getItem('bestRecords')
      let records = userRecords ? JSON.parse(userRecords) : [] as number[]

      const userResult = Math.round(correctKeystroke / 5)
      if (userResult > 0) {
        let newRecords = records.concat(userResult)
        newRecords.sort((a: number, b: number) => b - a)

        if (newRecords.length > 3) {
          newRecords = newRecords.slice(0, -1)
        }

        localStorage.setItem('bestRecords', JSON.stringify(newRecords))
        setRecords(newRecords)
      }
    }
  }, [timer, correctKeystroke])

  const timerHandler = () => {
    let timesLeft: number = timer
    intervalRef.current = setInterval(() => {
      timesLeft -= 1
      setTimer(prevTimer => prevTimer - 1)

      if (timesLeft <= 0) {
        clearInterval(intervalRef.current)
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
    if (key.length === 1 && key !== " ") {
      if (totalKeyStrokes === 0) { //start timer when user first enter key
        timerHandler()
      }

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
    clearInterval(intervalRef.current)
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

  const clearRecords = () => {
    const bestRecords = localStorage.getItem('bestRecords')
    if (bestRecords) {
      localStorage.removeItem('bestRecords')
      setRecords([])
    }
  }

  return (
    <>
      <a href="https://github.com/rayhannr/type-so-fast" target="_blank" rel="noreferrer" className="absolute font-inter flex flex-row items-center" style={{ top: 20, right: 20 }}>
        <p className="text-gray-600 mr-3">Source code</p>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill='#4B5563' ><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
      </a>
      <div className="font-inter p-8 pt-16 md:p-14 md:pt-20 lg:p-16 lg:pt-24">
        <Heading />
        <div className="lg:flex lg:flex-row lg:justify-center lg:items-start">

          <div className="md:max-w-4xl lg:max-w-2xl xl:max-w-3xl mr-8">
            <WordContainer words={words} isInputCorrect={isInputCorrect || wordInput.length === 0} />

            <div className="lg:flex lg:flex-row lg:justify-between lg:items-start mt-6 md:mt-8">
              <div className="flex flex-row items-center justify-center">
                <Input
                  value={wordInput}
                  disabled={timer === 0}
                  onChange={inputHandler}
                  onKeyUp={keyUpHandler} />
                <Timer timer={timer} />
                <RestartButton onClick={restartHandler} />
              </div>
              <Records records={records} clearRecords={clearRecords} />
            </div>
          </div>

          {timer === 0 &&
            <Result
              wpm={Math.round(correctKeystroke / 5)}
              correctKeystroke={correctKeystroke}
              wrongKeystroke={wrongKeystroke}
              accuracy={(correctKeystroke * 100 / (totalKeyStrokes + correction)).toFixed(2)}
              correctWords={correctWords}
              wrongWords={wrongWords} />
          }
        </div>

      </div>
    </>
  )
}

export default App