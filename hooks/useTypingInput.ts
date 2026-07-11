'use client'

import { useRef, useState, ChangeEvent, InputEvent, KeyboardEvent, Dispatch } from 'react'
import { GameState, GameAction, Keystroke } from '@/lib/gameReducer'
import { playKeyClick, playErrorBuzz, playWordChime } from '@/lib/sounds'

export const useTypingInput = (state: GameState, dispatch: Dispatch<GameAction>, onFirstKeystroke?: () => void) => {
  const keystrokeRef = useRef<Keystroke>({ id: 0, char: '' })
  const [capsLockOn, setCapsLockOn] = useState(false)

  const changeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    const currentWord = state.words[0]
    if (value.endsWith(' ') && value.slice(0, -1) === currentWord) playWordChime()
    dispatch({ type: 'INPUT_CHANGE', value, currentWord })
  }

  const inputHandler = (event: InputEvent<HTMLInputElement>) => {
    const currentWord = state.words[0]
    // the InputEvent type declares `data` on the synthetic event, but at runtime
    // React still only populates it on the underlying native event
    const currentKey = event.nativeEvent.data
    if (currentKey?.length === 1) {
      keystrokeRef.current = { id: keystrokeRef.current.id + 1, char: currentKey }

      if (currentKey !== ' ') {
        onFirstKeystroke?.()

        if (state.isInputCorrect) playKeyClick()
        else playErrorBuzz()

        // past the word's end the player should have pressed space, so the miss lands there
        const position = state.wordInput.length
        const expectedChar = currentWord && position < currentWord.length ? currentWord[position] : ' '
        dispatch({
          type: 'KEYSTROKE',
          correct: state.isInputCorrect,
          missedChar: currentKey === expectedChar ? undefined : expectedChar,
        })
      }
    }

    if (event.nativeEvent.inputType === 'deleteContentBackward') {
      keystrokeRef.current = { id: keystrokeRef.current.id + 1, char: '\b' }
      dispatch({ type: 'BACKSPACE' })
    }
  }

  const keyDownHandler = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState('CapsLock'))
  }

  return { keystrokeRef, capsLockOn, changeHandler, inputHandler, keyDownHandler }
}
