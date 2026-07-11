'use client'

import { useState } from 'react'
import { useLeaderboardQuery } from '@/lib/queries/leaderboard'
import { LeaderboardMetric, LeaderboardRange } from '@/lib/ags/leaderboard'
import { DURATIONS, Duration } from './DurationSelector'
import { ModeSelector } from './ModeSelector'
import { WordMode } from '@/lib/word-generators'
import { Podium3D } from './Podium3D'
import { SelectorButtons } from './SelectorButtons'

interface Props {
  currentUserId: string | null
}

const RANGES: LeaderboardRange[] = ['alltime', 'weekly']
const METRICS: LeaderboardMetric[] = ['wpm', 'xp']
const DURATION_FILTERS: (Duration | 'all')[] = ['all', ...DURATIONS]

export const Leaderboard = ({ currentUserId }: Props) => {
  const [metric, setMetric] = useState<LeaderboardMetric>('wpm')
  const [duration, setDuration] = useState<Duration | 'all'>('all')
  const [mode, setMode] = useState<WordMode>('words')
  const [range, setRange] = useState<LeaderboardRange>('alltime')

  const leaderboard = useLeaderboardQuery({
    metric,
    duration: metric === 'xp' || duration === 'all' ? null : duration,
    mode,
    range,
  })
  const isReady = !leaderboard.isFetching && !leaderboard.isError
  const entries = leaderboard.data ?? []

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <div className="flex flex-col items-center gap-2 mb-8">
        <SelectorButtons
          options={METRICS}
          active={metric}
          onChange={setMetric}
          ariaLabel="Metric filter"
          getLabel={(m) => (m === 'wpm' ? 'WPM' : 'XP')}
        />

        {metric === 'wpm' && (
          <>
            <SelectorButtons
              options={DURATION_FILTERS}
              active={duration}
              onChange={setDuration}
              ariaLabel="Duration filter"
              getLabel={(d) => (d === 'all' ? 'All' : `${d}s`)}
            />

            {duration === 'all' && (
              <>
                <ModeSelector active={mode} disabled={false} onChange={setMode} />
                <SelectorButtons
                  options={RANGES}
                  active={range}
                  onChange={setRange}
                  ariaLabel="Time range filter"
                  getLabel={(r) => (r === 'alltime' ? 'All-time' : 'This week')}
                />
              </>
            )}
          </>
        )}
      </div>

      {leaderboard.isFetching && <p className="text-center text-sm text-muted py-8">Loading...</p>}
      {leaderboard.isError && <p className="text-center text-sm text-muted py-8">Couldn&apos;t load the leaderboard — try again later.</p>}
      {isReady && entries.length === 0 && (
        <p className="text-center text-sm text-muted py-8">No scores yet — be the first!</p>
      )}

      {isReady && entries.length > 0 && (
        <>
          <Podium3D records={top3.map((entry) => entry.wpm)} labels={top3.map((entry) => entry.displayName)} />

          {rest.length > 0 && (
            <table className="w-full mt-8 text-sm border-collapse">
              <thead>
                <tr className="text-muted text-left">
                  <th className="font-normal py-2 px-3 w-12">#</th>
                  <th className="font-normal py-2 px-3">Name</th>
                  <th className="font-normal py-2 px-3 text-right">{metric === 'xp' ? 'XP' : 'WPM'}</th>
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
                        {isCurrentUser && <span className="text-muted font-normal text-xs ml-2">(You)</span>}
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
