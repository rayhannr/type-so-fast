'use client'

import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useAgsSessionContext } from '@/lib/ags/AgsSessionContext'
import { useFriendsPresence } from '@/hooks/useFriendsPresence'
import { useSendInviteMutation } from '@/lib/queries/matchInvites'
import { updateDisplayNameErrorMessage, useUpdateDisplayNameMutation } from '@/lib/queries/displayName'
import {
  addFriendErrorMessage,
  useAcceptFriendRequestMutation,
  useAddFriendMutation,
  useBlockedUsersQuery,
  useBlockUserMutation,
  useDeclineFriendRequestMutation,
  useFriendsQuery,
  useIncomingFriendRequestsQuery,
  useRemoveFriendMutation,
  useUnblockUserMutation,
} from '@/lib/queries/social'

const buttonBaseClass = 'px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer disabled:cursor-default disabled:opacity-50'
const ghostButtonClass = `${buttonBaseClass} text-muted hover:text-active disabled:hover:text-muted`
const accentButtonClass = `${buttonBaseClass} text-accent hover:bg-canvas disabled:hover:bg-transparent`
const dangerButtonClass = `${buttonBaseClass} text-error`
const invitedButtonClass = `${buttonBaseClass} text-correct`
const rowClass =
  'group flex flex-row items-center gap-3 rounded-lg border border-solid border-edge bg-surface px-4 py-3 transition-colors hover:border-accent/40'

type ConfirmableAction = 'remove' | 'block'

const SectionHeading = ({ label, count }: { label: string; count?: number }) => (
  <div className="flex flex-row items-baseline gap-2 mb-3">
    <h3 className="text-muted text-xs uppercase tracking-widest">{label}</h3>
    {count !== undefined && count > 0 && (
      <span className="text-[10px] text-accent bg-canvas rounded-full px-1.5 py-0.5 leading-none tabular-nums">{count}</span>
    )}
  </div>
)

const StatusLine = ({ tone, children }: { tone: 'muted' | 'correct' | 'error'; children: ReactNode }) => {
  const toneClass = { muted: 'text-muted', correct: 'text-correct', error: 'text-error' }[tone]
  return <p className={`text-xs ${toneClass}`}>{children}</p>
}

export const FriendsTab = () => {
  const { session, publicId, displayName } = useAgsSessionContext()

  const friends = useFriendsQuery(session)
  const incomingRequests = useIncomingFriendRequestsQuery(session)
  const blockedUsers = useBlockedUsersQuery(session)
  const onlineUserIds = useFriendsPresence(session)

  const addFriend = useAddFriendMutation(session)
  const acceptRequest = useAcceptFriendRequestMutation(session)
  const declineRequest = useDeclineFriendRequestMutation(session)
  const removeFriend = useRemoveFriendMutation(session)
  const blockUser = useBlockUserMutation(session)
  const unblockUser = useUnblockUserMutation(session)
  const sendInvite = useSendInviteMutation(session)
  const updateDisplayName = useUpdateDisplayNameMutation(session)

  const [codeInput, setCodeInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState<{ userId: string; action: ConfirmableAction } | null>(null)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const startEditingName = () => {
    setNameInput(displayName ?? '')
    setEditingName(true)
  }

  const submitDisplayName = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === displayName) {
      setEditingName(false)
      return
    }
    updateDisplayName.mutate(trimmed, { onSuccess: () => setEditingName(false) })
  }

  const copyCode = () => {
    if (!publicId) return
    navigator.clipboard.writeText(publicId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const submitAddFriend = (event: FormEvent) => {
    event.preventDefault()
    const code = codeInput.trim().toUpperCase()
    if (!code) return
    addFriend.mutate(code, { onSuccess: () => setCodeInput('') })
  }

  const handleConfirmable = (userId: string, action: ConfirmableAction) => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)

    if (confirming?.userId === userId && confirming.action === action) {
      setConfirming(null)
      if (action === 'remove') removeFriend.mutate(userId)
      else blockUser.mutate(userId)
      return
    }

    setConfirming({ userId, action })
    confirmTimerRef.current = setTimeout(() => setConfirming(null), 2500)
  }

  const confirmableButton = (userId: string, action: ConfirmableAction, label: string, disabled: boolean) => {
    const isConfirming = confirming?.userId === userId && confirming.action === action
    return (
      <button
        type="button"
        onClick={() => handleConfirmable(userId, action)}
        disabled={disabled}
        className={isConfirming ? dangerButtonClass : ghostButtonClass}
      >
        {isConfirming ? 'Sure?' : label}
      </button>
    )
  }

  if (!session) {
    return (
      <div className="w-full max-w-xl mx-auto mt-10">
        <p className="text-center text-xs text-muted">Offline — friends are available once the game connects.</p>
      </div>
    )
  }

  const friendCount = friends.data?.length ?? 0

  return (
    <div className="w-full max-w-xl mx-auto mt-10">
      <div className="flex flex-row flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-solid border-edge bg-surface px-4 py-3 mb-6">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] text-muted uppercase tracking-widest">Your name</span>
          {editingName ? (
            <form onSubmit={submitDisplayName} className="flex flex-row flex-wrap items-center gap-2">
              <input
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                aria-label="Display name"
                autoFocus
                maxLength={40}
                className="w-40 min-w-0 rounded-lg border border-solid border-edge bg-canvas px-3 py-1.5 text-sm text-active focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="submit"
                disabled={updateDisplayName.isPending || !nameInput.trim()}
                className={`${accentButtonClass} border border-solid border-edge`}
              >
                {updateDisplayName.isPending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditingName(false)} className={ghostButtonClass}>
                Cancel
              </button>
            </form>
          ) : (
            <button type="button" onClick={startEditingName} className="group flex flex-row items-center gap-1.5 cursor-pointer max-w-full">
              <span className="text-lg font-bold text-active truncate">{displayName ?? '········'}</span>
              <svg
                className="w-3.5 h-3.5 shrink-0 text-muted group-hover:text-active transition-colors"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-9.5a2.121 2.121 0 013 3L12 16l-4 1 1-4 9.5-9.5z"
                />
              </svg>
            </button>
          )}
          {updateDisplayName.isError && <StatusLine tone="error">{updateDisplayNameErrorMessage(updateDisplayName.error)}</StatusLine>}
        </div>

        <button
          type="button"
          onClick={copyCode}
          disabled={!publicId}
          title="Copy your friend code"
          className="group flex flex-col items-start sm:items-end gap-0.5 cursor-pointer disabled:cursor-default"
        >
          <span className={`text-[10px] uppercase tracking-widest transition-colors ${copied ? 'text-correct' : 'text-muted'}`}>
            {copied ? 'Copied' : 'Your code'}
          </span>
          <span className="flex flex-row items-center gap-1.5">
            <span data-testid="friend-code" className="text-lg font-bold text-accent tracking-[0.2em] tabular-nums">
              {publicId ?? '········'}
            </span>
            {copied ? (
              <svg className="w-4 h-4 text-correct" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-muted group-hover:text-active transition-colors"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 012-2h10" />
              </svg>
            )}
          </span>
        </button>
      </div>

      <form onSubmit={submitAddFriend} className="flex flex-row gap-2">
        <input
          value={codeInput}
          onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
          placeholder="Enter a friend's code"
          aria-label="Friend's code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={16}
          className="flex-1 min-w-0 rounded-lg border border-solid border-edge bg-surface px-4 py-2.5 text-sm text-active tracking-widest placeholder:tracking-normal placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={addFriend.isPending || !codeInput.trim()}
          className="shrink-0 rounded-lg border border-solid border-edge bg-surface px-4 text-sm text-accent transition-colors cursor-pointer hover:border-accent disabled:cursor-default disabled:text-muted disabled:hover:border-edge"
        >
          {addFriend.isPending ? 'Sending…' : 'Add friend'}
        </button>
      </form>
      <div className="min-h-6 pt-1.5 mb-4">
        {addFriend.isSuccess && <StatusLine tone="correct">Friend request sent — they&apos;ll see it on their Friends tab.</StatusLine>}
        {addFriend.isError && <StatusLine tone="error">{addFriendErrorMessage(addFriend.error)}</StatusLine>}
      </div>

      {incomingRequests.isFetching ? (
        <section className="mb-8">
          <SectionHeading label="Requests" />
          <StatusLine tone="muted">Loading…</StatusLine>
        </section>
      ) : (incomingRequests.data ?? []).length > 0 && (
        <section className="mb-8">
          <SectionHeading label="Requests" count={incomingRequests.data!.length} />
          <ul className="flex flex-col gap-2">
            {incomingRequests.data!.map((requester) => (
              <li key={requester.userId} className={`${rowClass} border-l-2 border-l-accent`}>
                <p className="text-sm text-active">{requester.displayName}</p>
                <span className="text-[10px] text-muted">wants to be friends</span>
                <div className="ml-auto flex flex-row gap-1">
                  <button
                    type="button"
                    onClick={() => acceptRequest.mutate(requester.userId)}
                    disabled={acceptRequest.isPending || declineRequest.isPending}
                    className={accentButtonClass}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => declineRequest.mutate(requester.userId)}
                    disabled={acceptRequest.isPending || declineRequest.isPending}
                    className={ghostButtonClass}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <SectionHeading label="Friends" count={friendCount} />
        {friends.isFetching && <StatusLine tone="muted">Loading…</StatusLine>}
        {friends.isError && <StatusLine tone="muted">Couldn&apos;t load your friends — try again later.</StatusLine>}

        {friends.isSuccess && friendCount === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-edge px-4 py-10 text-center">
            <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19a4 4 0 00-8 0M11 11a3 3 0 100-6 3 3 0 000 6zM19 8v6M22 11h-6"
              />
            </svg>
            <p className="text-sm text-active">No friends yet</p>
            <p className="text-xs text-muted max-w-60">Share your code above — once they add you and you accept, they&apos;ll show up here.</p>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {(friends.data ?? []).map((friend) => {
            const online = onlineUserIds.has(friend.userId)
            const invited = sendInvite.isSuccess && sendInvite.variables === friend.userId
            return (
              <li key={friend.userId} className={rowClass}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-correct' : 'bg-edge'}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm text-active truncate">{friend.displayName}</p>
                  <p className="text-[10px] text-muted leading-tight">{online ? 'Online' : 'Offline'}</p>
                </div>
                <div className="ml-auto flex flex-row items-center gap-1">
                  <button
                    type="button"
                    onClick={() => sendInvite.mutate(friend.userId)}
                    disabled={sendInvite.isPending || invited}
                    className={invited ? invitedButtonClass : accentButtonClass}
                  >
                    {invited ? 'Invited ✓' : 'Invite'}
                  </button>
                  {confirmableButton(friend.userId, 'remove', 'Remove', removeFriend.isPending)}
                  {confirmableButton(friend.userId, 'block', 'Block', blockUser.isPending)}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {blockedUsers.isFetching ? (
        <section>
          <SectionHeading label="Blocked" />
          <StatusLine tone="muted">Loading…</StatusLine>
        </section>
      ) : (blockedUsers.data ?? []).length > 0 && (
        <section>
          <SectionHeading label="Blocked" count={blockedUsers.data!.length} />
          <ul className="flex flex-col gap-2">
            {blockedUsers.data!.map((blocked) => (
              <li key={blocked.userId} className={`${rowClass} opacity-70 hover:opacity-100`}>
                <p className="text-sm text-muted">{blocked.displayName}</p>
                <button
                  type="button"
                  onClick={() => unblockUser.mutate(blocked.userId)}
                  disabled={unblockUser.isPending}
                  className={`ml-auto ${ghostButtonClass}`}
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
