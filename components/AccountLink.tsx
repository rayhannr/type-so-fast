'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
          renderButton: (parent: HTMLElement, options: { theme: string; size: string }) => void
        }
      }
    }
  }
}

export const AccountLink = () => {
  const { session, loginWithGoogle, linkGoogle } = useAgsSessionContext()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'link' | 'signin'>('link')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [googleReady, setGoogleReady] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const initializedRef = useRef(false)
  const modeRef = useRef(mode)
  modeRef.current = mode

  useEffect(() => {
    if (!open) return
    const onOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [open])

  useEffect(() => {
    if (!open || !googleReady || !googleButtonRef.current || !window.google || initializedRef.current) return
    initializedRef.current = true

    const handleCredential = async (idToken: string) => {
      setError(null)
      setStatus(null)
      try {
        if (modeRef.current === 'link') {
          await linkGoogle(idToken)
          setStatus('Google linked — sign in with the same Google account on any device to resume this progress.')
        } else {
          await loginWithGoogle(idToken)
          setStatus('Signed in.')
        }
      } catch {
        setError(modeRef.current === 'link' ? 'Could not link this Google account.' : 'Could not sign in with this Google account.')
      }
    }

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      callback: response => handleCredential(response.credential)
    })
    window.google.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'medium' })
  }, [open, googleReady, linkGoogle, loginWithGoogle])

  return (
    <div ref={containerRef} className="relative">
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" onReady={() => setGoogleReady(true)} />
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Account"
        aria-expanded={open}
        className="text-muted hover:text-active transition-colors cursor-pointer p-1"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>

      {open && (
        <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-full left-3 sm:left-auto mt-0 sm:mt-2 z-20 bg-surface border border-solid border-edge rounded-lg p-3 shadow-lg sm:w-72 space-y-3">
          <div className="flex flex-row gap-1 text-xs">
            <button
              type="button"
              onClick={() => setMode('link')}
              className={`flex-1 rounded px-2 py-1 cursor-pointer transition-colors ${mode === 'link' ? 'bg-canvas text-active border border-solid border-accent' : 'text-muted hover:text-active'}`}
            >
              Save progress
            </button>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 rounded px-2 py-1 cursor-pointer transition-colors ${mode === 'signin' ? 'bg-canvas text-active border border-solid border-accent' : 'text-muted hover:text-active'}`}
            >
              Restore on this device
            </button>
          </div>

          <p className="text-xs text-muted">
            {mode === 'link'
              ? 'Link Google to this account so you can sign in and resume your progress on another device.'
              : 'Sign in with the Google account you linked elsewhere to bring that progress here.'}
          </p>

          <div ref={googleButtonRef} />

          {status && <p className="text-xs text-green-500">{status}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}
          {mode === 'link' && !session && <p className="text-xs text-red-500">You need an active session to link Google.</p>}
        </div>
      )}
    </div>
  )
}
