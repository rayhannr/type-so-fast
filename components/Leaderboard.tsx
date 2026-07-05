'use client'

import { useEffect, useState } from 'react'
import { apiGetLeaderboard } from '@/lib/api'
import type { LeaderboardEntry } from '@/lib/ags/leaderboard'

interface Props {
  refreshKey: number
  currentUserId: string | null
}

export const Leaderboard = ({ refreshKey, currentUserId }: Props) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    setStatus('loading')
    apiGetLeaderboard(10)
      .then((data) => {
        if (cancelled) return
        setEntries(data)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  if (status === 'error') return null

  return (
    <div className="mx-auto lg:mx-0 mt-8 w-64 sm:w-72 rounded-lg bg-white border border-solid border-gray-200">
      <p className="bg-blue-600 text-gray-100 text-center font-semibold text-lg py-3 rounded-t-lg">Global Leaderboard</p>
      {status === 'loading' && <p className="text-center text-sm text-gray-500 py-4">Loading...</p>}
      {status === 'ready' && entries.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-4">No scores yet. Be the first!</p>
      )}
      {status === 'ready' && entries.length > 0 && (
        <ul className="py-2">
          {entries.map((entry) => (
            <li
              key={entry.userId}
              className={`flex flex-row justify-between px-4 py-1.5 text-sm ${
                entry.userId === currentUserId ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'
              }`}
            >
              <span>
                #{entry.rank} {entry.displayName}
              </span>
              <span>{entry.wpm} WPM</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
