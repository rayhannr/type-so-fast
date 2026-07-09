'use client'

import { useEffect, useRef, useState } from 'react'
import { useSettingsQuery, useSaveSettingsMutation } from '@/lib/queries/settings'
import type { AgsSession } from '@/lib/queries/shared'

const DEFAULT_ACCENT = '#e2b714'

const PRESETS = ['#e2b714', '#3b82f6', '#22c55e', '#ec4899', '#a855f7', '#f97316']

const isValidHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value)

const applyAccent = (color: string) => {
  if (color === DEFAULT_ACCENT) document.documentElement.style.removeProperty('--accent')
  else document.documentElement.style.setProperty('--accent', color)
}

interface Props {
  session: AgsSession | null
}

export const AccentPicker = ({ session }: Props) => {
  const [open, setOpen] = useState(false)
  const [accent, setAccent] = useState(DEFAULT_ACCENT)
  const [hexInput, setHexInput] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('accentColor')
    if (saved && isValidHex(saved)) {
      setAccent(saved)
      applyAccent(saved)
    }
  }, [])

  const settings = useSettingsQuery(session)
  const saveSettingsMutation = useSaveSettingsMutation(session)

  useEffect(() => {
    const cloud = settings.data?.accentColor
    if (cloud && isValidHex(cloud)) {
      setAccent(cloud)
      applyAccent(cloud)
      localStorage.setItem('accentColor', cloud)
    }
  }, [settings.data])

  useEffect(() => {
    if (!open) return
    const onOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [open])

  const pick = (color: string) => {
    setAccent(color)
    applyAccent(color)
    localStorage.setItem('accentColor', color)
    if (session) saveSettingsMutation.mutate({ accentColor: color })
  }

  const submitHex = () => {
    const value = hexInput.startsWith('#') ? hexInput : `#${hexInput}`
    if (!isValidHex(value)) return
    pick(value.toLowerCase())
    setHexInput('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Customize accent color"
        aria-expanded={open}
        className="text-muted hover:text-active transition-colors cursor-pointer p-1"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9 9 0 110-18 9 8 0 018.7 6.6c.3 1.2-.7 2.4-2 2.4h-2.2a2.5 2.5 0 00-2 4 1.8 1.8 0 01-1.4 3z"
          />
          <circle cx="7.5" cy="11.5" r="0.5" fill="currentColor" />
          <circle cx="10.5" cy="7.5" r="0.5" fill="currentColor" />
          <circle cx="15" cy="7.5" r="0.5" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 bg-surface border border-solid border-edge rounded-lg p-3 shadow-lg w-44">
          <p className="text-xs text-muted mb-2">Accent color</p>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => pick(color)}
                aria-label={`Use accent ${color}`}
                className="w-5 h-5 rounded-full cursor-pointer border-2 border-solid transition-transform hover:scale-110"
                style={{ backgroundColor: color, borderColor: color === accent ? 'var(--text-active)' : 'transparent' }}
              />
            ))}
          </div>
          <div className="flex flex-row gap-1.5">
            <input
              type="text"
              value={hexInput}
              onChange={(event) => setHexInput(event.target.value.trim())}
              onKeyDown={(event) => event.key === 'Enter' && submitHex()}
              placeholder="#hex"
              maxLength={7}
              className="w-full min-w-0 text-xs text-active bg-canvas border border-solid border-edge rounded px-1.5 py-1 outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={submitHex}
              className="text-xs text-muted hover:text-accent transition-colors cursor-pointer"
            >
              Set
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
