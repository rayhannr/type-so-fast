'use client'

import { createContext, useContext } from 'react'
import { useAgsSession } from './useAgsSession'
import type { AgsSession } from '@/lib/queries'

interface AgsSessionState {
  session: AgsSession | null
  displayName: string | null
}

const AgsSessionContext = createContext<AgsSessionState | null>(null)

export const AgsSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useAgsSession()
  return <AgsSessionContext.Provider value={value}>{children}</AgsSessionContext.Provider>
}

export const useAgsSessionContext = (): AgsSessionState => {
  const context = useContext(AgsSessionContext)
  if (!context) throw new Error('useAgsSessionContext must be used within an AgsSessionProvider')
  return context
}
