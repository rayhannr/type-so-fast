'use client'

import { useEffect, useState } from 'react'
import { apiGetLeaderboard } from '@/lib/api'
import type { LeaderboardEntry } from '@/lib/ags/leaderboard'
import { Podium3D } from './Podium3D'

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

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <h2 className="text-muted text-sm mb-6 text-center">global leaderboard</h2>

      {status === 'loading' && <p className="text-center text-sm text-muted py-8">loading...</p>}
      {status === 'error' && <p className="text-center text-sm text-muted py-8">couldn&apos;t load the leaderboard — try again later</p>}
      {status === 'ready' && entries.length === 0 && (
        <p className="text-center text-sm text-muted py-8">no scores yet — be the first!</p>
      )}

      {status === 'ready' && entries.length > 0 && (
        <>
          <Podium3D records={top3.map((entry) => entry.wpm)} labels={top3.map((entry) => entry.displayName)} />

          {rest.length > 0 && (
            <table className="w-full mt-8 text-sm border-collapse">
              <thead>
                <tr className="text-muted text-left">
                  <th className="font-normal py-2 px-3 w-12">#</th>
                  <th className="font-normal py-2 px-3">name</th>
                  <th className="font-normal py-2 px-3 text-right">wpm</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((entry) => {
                  const isCurrentUser = entry.userId === currentUserId
                  return (
                    <tr
                      key={entry.userId}
                      className={`border-t border-solid border-edge ${isCurrentUser ? 'text-accent font-semibold' : 'text-active'}`}
                    >
                      <td className="py-2 px-3 text-muted">{entry.rank}</td>
                      <td className="py-2 px-3">
                        {entry.displayName}
                        {isCurrentUser && <span className="text-muted font-normal text-xs ml-2">(you)</span>}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{entry.wpm}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
