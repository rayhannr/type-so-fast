'use client'

import { useEffect, useRef, useState } from 'react'
import { useLoginMutation, useDisplayNameQuery, useMyProfileQuery } from '@/lib/queries'
import type { AgsSession } from '@/lib/queries'

const getDeviceId = (): string => {
  const key = 'deviceId'
  const existing = localStorage.getItem(key)
  if (existing) return existing

  const id = crypto.randomUUID()
  localStorage.setItem(key, id)
  return id
}

interface AgsSessionState {
  session: AgsSession | null
  displayName?: string
  publicId?: string
}

export const useAgsSession = (): AgsSessionState => {
  const [session, setSession] = useState<AgsSession | null>(null)
  const hasInitialized = useRef(false)
  const loginMutation = useLoginMutation()

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    // AGS unavailable; game still works via localStorage fallbacks with session left null
    loginMutation.mutate(getDeviceId(), { onSuccess: setSession, onError: () => { } })
  }, [])

  const displayName = useDisplayNameQuery(session)
  const profile = useMyProfileQuery(session)

  return { session, displayName: displayName.data, publicId: profile.data?.publicId }
}
