'use client'

import { useEffect, useRef, useState } from 'react'
import { useGoogleLoginMutation, useLinkGoogleMutation, useLoginMutation } from '@/lib/queries/auth'
import { useDisplayNameQuery } from '@/lib/queries/displayName'
import { useMyProfileQuery } from '@/lib/queries/profile'
import { AgsSession } from '@/lib/queries/shared'

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
  loginWithGoogle: (idToken: string) => Promise<void>
  linkGoogle: (idToken: string) => Promise<void>
}

export const useAgsSession = (): AgsSessionState => {
  const [session, setSession] = useState<AgsSession | null>(null)
  const hasInitialized = useRef(false)
  const loginMutation = useLoginMutation()
  const googleLoginMutation = useGoogleLoginMutation()
  const linkGoogleMutation = useLinkGoogleMutation()

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    // AGS unavailable; game still works via localStorage fallbacks with session left null
    loginMutation.mutate(getDeviceId(), { onSuccess: setSession, onError: () => {} })
  }, [])

  const displayName = useDisplayNameQuery(session)
  const profile = useMyProfileQuery(session)

  const loginWithGoogle = async (idToken: string) => setSession(await googleLoginMutation.mutateAsync(idToken))

  const linkGoogle = async (idToken: string) => {
    if (!session) throw new Error('linkGoogle requires an active session')
    await linkGoogleMutation.mutateAsync({ session, idToken })
  }

  return { session, displayName: displayName.data, publicId: profile.data?.publicId, loginWithGoogle, linkGoogle }
}
