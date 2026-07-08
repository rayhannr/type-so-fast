'use client'

import { useEffect, useRef } from 'react'
import { CaretTrail } from './CaretTrail'
import type { CaretPosition } from './CaretTrail'

type Props = {
  words: string[]
  typedInput: string
  wpm: number
  wrongKeystroke: number
  onFocusRequest: () => void
  compact?: boolean
}

const VISIBLE_WORDS = 60

export const WordContainer = ({ words, typedInput, wpm, wrongKeystroke, onFocusRequest, compact = false }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const caretElRef = useRef<HTMLSpanElement | null>(null)
  const caretPosRef = useRef<CaretPosition>({ x: 0, y: 0 })

  // measure the caret every render so the particle trail can follow it
  useEffect(() => {
    const container = containerRef.current
    const caret = caretElRef.current
    if (!container || !caret) return
    const containerRect = container.getBoundingClientRect()
    const caretRect = caret.getBoundingClientRect()
    caretPosRef.current = {
      x: caretRect.left - containerRect.left + caretRect.width / 2,
      y: caretRect.top - containerRect.top + caretRect.height / 2,
    }
  })

  const currentWord = words[0] ?? ''
  const typed = typedInput
  const extraChars = typed.slice(currentWord.length)
  const caret = <span ref={caretElRef} className="caret" aria-hidden="true" />

  return (
    <div
      ref={containerRef}
      onClick={onFocusRequest}
      data-testid={compact ? 'word-container-compact' : 'word-container'}
      className={
        compact
          ? 'relative select-none overflow-hidden h-14 leading-7 text-base opacity-80'
          : 'relative cursor-text select-none overflow-hidden h-[7.5rem] md:h-[9rem] leading-10 md:leading-12 text-2xl md:text-3xl'
      }
    >
      <span className="break-words">
        {currentWord.split('').map((char, index) => {
          const isTyped = index < typed.length
          const color = !isTyped ? 'text-active' : typed[index] === char ? 'text-correct' : 'text-error'
          return (
            <span key={index}>
              {index === typed.length && caret}
              <span className={color}>{char}</span>
            </span>
          )
        })}
        {extraChars.split('').map((char, index) => (
          <span key={`extra-${index}`} className="text-error opacity-60">
            {char}
          </span>
        ))}
        {typed.length >= currentWord.length && caret}
      </span>{' '}
      {words.slice(1, VISIBLE_WORDS).map((word, index) => (
        <span key={`${word}-${index}`} className="text-muted">
          {word}{' '}
        </span>
      ))}
      {!compact && <CaretTrail caretRef={caretPosRef} wpm={wpm} wrongKeystroke={wrongKeystroke} />}
    </div>
  )
}
