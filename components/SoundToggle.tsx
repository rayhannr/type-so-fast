'use client'

import { useEffect, useState } from 'react'
import { loadSoundPreference, setSoundEnabled, playWordChime } from '@/lib/sounds'

export const SoundToggle = () => {
  // sounds are off by default; the server-rendered icon matches, so loading the
  // saved preference in an effect avoids a hydration mismatch
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(loadSoundPreference())
  }, [])

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    setSoundEnabled(next)
    if (next) playWordChime()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={enabled ? 'Mute sound effects' : 'Enable sound effects'}
      className="text-muted hover:text-active transition-colors cursor-pointer p-1"
    >
      {enabled ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
          <path strokeLinecap="round" d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
          <path strokeLinecap="round" d="M16 9l6 6m0-6l-6 6" />
        </svg>
      )}
    </button>
  )
}
