'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { usePendingInvite } from '@/hooks/usePendingInvite'
import { useAcceptInviteMutation, useDeclineInviteMutation } from '@/lib/queries/matchInvites'
import { AgsSession } from '@/lib/queries/shared'

interface Props {
  session: AgsSession | null
}

export const PendingInviteBanner = ({ session }: Props) => {
  const router = useRouter()
  const { invite, acceptedInvite, declined, dismissInvite, dismissAcceptedInvite, dismissDeclined } = usePendingInvite(session)
  const acceptInvite = useAcceptInviteMutation(session)
  const declineInvite = useDeclineInviteMutation(session)

  // the invite I sent was accepted elsewhere — join the same session the accepter was handed
  useEffect(() => {
    if (!acceptedInvite) return
    router.push(`/pvp?session=${acceptedInvite.sessionId}`)
    dismissAcceptedInvite()
  }, [acceptedInvite])

  useEffect(() => {
    if (!declined) return
    const timeout = setTimeout(dismissDeclined, 4000)
    return () => clearTimeout(timeout)
  }, [declined])

  const handleAccept = () => {
    if (!invite) return
    acceptInvite.mutate(invite.inviterUserId, {
      onSuccess: pvpSession => {
        dismissInvite()
        router.push(`/pvp?session=${pvpSession.id}`)
      }
    })
  }

  const handleDecline = () => {
    if (!invite) return
    declineInvite.mutate(invite.inviterUserId, { onSuccess: dismissInvite })
  }

  if (!invite && !declined) return null

  return (
    <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4" role="status">
      {invite && (
        <div className="flex flex-row items-center gap-4 rounded-lg border border-solid border-accent/40 bg-surface shadow-lg px-4 py-3">
          <p className="text-sm text-active">You&apos;ve been invited to a match!</p>
          <div className="flex flex-row gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={acceptInvite.isPending}
              className="px-3 py-1 text-xs rounded-md bg-accent text-black font-semibold cursor-pointer hover:opacity-90 disabled:cursor-default disabled:opacity-50 transition-opacity"
            >
              {acceptInvite.isPending ? 'Joining…' : 'Accept'}
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={declineInvite.isPending}
              className="px-3 py-1 text-xs rounded-md border border-solid border-edge text-muted hover:text-active cursor-pointer disabled:cursor-default disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}
      {!invite && declined && (
        <div className="rounded-lg border border-solid border-edge bg-surface shadow-lg px-4 py-3">
          <p className="text-sm text-muted">Your match invite was declined.</p>
        </div>
      )}
    </div>
  )
}
