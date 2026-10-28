'use client'

import { useEffect, useRef, useState } from 'react'
import {
  isGoogleLinkedElsewhere,
  useGoogleLoginMutation,
  useLinkGoogleMutation,
  useLoginMutation,
  useRefreshSessionMutation
} from '@/lib/queries/auth'
import { useDisplayNameQuery } from '@/lib/queries/displayName'
import { useMyProfileQuery } from '@/lib/queries/profile'
import { readLocal, writeLocal, AgsSession } from '@/lib/queries/shared'

const getDeviceId = (): string => {
  const key = 'deviceId'
  const existing = localStorage.getItem(key)
  if (existing) return existing

  const id = crypto.randomUUID()
  localStorage.setItem(key, id)
  return id
}

// set when this device signed in to the AGS user that owns a Google link, so reloads stay on
// that user instead of falling back to this device's own Device ID user
const googleRefreshTokenKey = 'googleRefreshToken'

// userId is the AGS user that owns the Google link; switched is true when Google was already
// linked to another user and this device is now signed in as that user
interface GoogleOutcome {
  userId: string
  switched: boolean
}

interface AgsSessionState {
  session: AgsSession | null
  displayName?: string
  publicId?: string
  continueWithGoogle: (idToken: string) => Promise<GoogleOutcome>
}

export const useAgsSession = (): AgsSessionState => {
  const [session, setSession] = useState<AgsSession | null>(null)
  const hasInitialized = useRef(false)
  const loginMutation = useLoginMutation()
  const googleLoginMutation = useGoogleLoginMutation()
  const linkGoogleMutation = useLinkGoogleMutation()
  const refreshSessionMutation = useRefreshSessionMutation()

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    // AGS unavailable; game still works via localStorage fallbacks with session left null
    const loginWithDevice = () => loginMutation.mutate(getDeviceId(), { onSuccess: setSession, onError: () => {} })

    const refreshToken = readLocal<string | null>(googleRefreshTokenKey, null)
    if (!refreshToken) {
      loginWithDevice()
      return
    }
    refreshSessionMutation.mutate(refreshToken, {
      onSuccess: refreshed => {
        writeLocal(googleRefreshTokenKey, refreshed.refreshToken)
        setSession(refreshed)
      },
      onError: () => {
        localStorage.removeItem(googleRefreshTokenKey)
        loginWithDevice()
      }
    })
  }, [])

  const displayName = useDisplayNameQuery(session)
  const profile = useMyProfileQuery(session)

  const continueWithGoogle = async (idToken: string): Promise<GoogleOutcome> => {
    if (!session) throw new Error('continueWithGoogle requires an active session')
    try {
      await linkGoogleMutation.mutateAsync({ session, idToken })
      return { userId: session.userId, switched: false }
    } catch (error) {
      if (!isGoogleLinkedElsewhere(error)) throw error
    }
    const googleSession = await googleLoginMutation.mutateAsync(idToken)
    writeLocal(googleRefreshTokenKey, googleSession.refreshToken)
    setSession(googleSession)
    return { userId: googleSession.userId, switched: true }
  }

  return { session, displayName: displayName.data, publicId: profile.data?.publicId, continueWithGoogle }
}
