'use client'

import { useEffect, useState } from 'react'
import { apiGetLeaderboard } from '@/lib/api'
import type { LeaderboardEntry, LeaderboardRange } from '@/lib/ags/leaderboard'
import { DURATIONS } from './DurationSelector'
import type { Duration } from './DurationSelector'
import { ModeSelector } from './ModeSelector'
import type { WordMode } from '@/lib/word-generators'
import { Podium3D } from './Podium3D'

interface Props {
  refreshKey: number
  currentUserId: string | null
}

const RANGES: LeaderboardRange[] = ['alltime', 'weekly']

export const Leaderboard = ({ refreshKey, currentUserId }: Props) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [duration, setDuration] = useState<Duration | 'all'>('all')
  const [mode, setMode] = useState<WordMode>('words')
  const [range, setRange] = useState<LeaderboardRange>('alltime')

  useEffect(() => {
    let cancelled = false

    setStatus('loading')
    apiGetLeaderboard({ limit: 10, duration: duration === 'all' ? null : duration, mode, range })
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
  }, [refreshKey, duration, mode, range])

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <h2 className="text-muted text-sm mb-6 text-center">global leaderboard</h2>

      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="flex flex-row justify-center gap-2" aria-label="Duration filter">
          <button
            type="button"
            onClick={() => setDuration('all')}
            aria-current={duration === 'all' ? 'true' : undefined}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
              duration === 'all' ? 'text-accent bg-surface' : 'text-muted hover:text-active'
            }`}
          >
            all
          </button>
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              aria-current={duration === d ? 'true' : undefined}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                duration === d ? 'text-accent bg-surface' : 'text-muted hover:text-active'
              }`}
            >
              {d}s
            </button>
          ))}
        </div>

        {duration === 'all' && (
          <>
            <ModeSelector active={mode} disabled={false} onChange={setMode} />
            <div className="flex flex-row justify-center gap-2" aria-label="Time range filter">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  aria-current={range === r ? 'true' : undefined}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                    range === r ? 'text-accent bg-surface' : 'text-muted hover:text-active'
                  }`}
                >
                  {r === 'alltime' ? 'all-time' : 'this week'}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

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
