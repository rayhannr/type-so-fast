'use client'

import { useEffect, RefObject } from 'react'

export const useTabRestart = (restartHandler: () => void, inputRef: RefObject<HTMLInputElement | null>) => {
  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault()
        restartHandler()
        return
      }

      // focusing here (before the browser's default insert action runs) means the
      // keystroke that triggered this still lands in the input, so typing works
      // without clicking into it first
      const active = document.activeElement
      const isEditableElsewhere =
        active instanceof HTMLElement &&
        active !== inputRef.current &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
      if (isEditableElsewhere) return

      if (/^[a-zA-Z0-9]$/.test(event.key) && document.activeElement !== inputRef.current) {
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [restartHandler])
}
