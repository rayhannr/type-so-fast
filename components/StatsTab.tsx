import { useHistoryQuery, useStreakQuery } from '@/lib/queries/cloudsave'
import { AgsSession } from '@/lib/queries/shared'
import { useStatsQuery } from '@/lib/queries/statistics'
import { HistoryChart } from './HistoryChart'

interface Props {
  session: AgsSession | null
}

const StatRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-row items-baseline justify-between py-2 border-b border-solid border-edge text-sm">
    <span className="text-muted">{label}</span>
    <span className="text-active font-medium">{children}</span>
  </div>
)

export const StatsTab = ({ session }: Props) => {
  const stats = useStatsQuery(session)
  const history = useHistoryQuery(session)
  const streak = useStreakQuery(session)
  const isLoggedIn = !!session

  return (
    <div className="w-full max-w-md mx-auto mt-10">
      {!isLoggedIn && <p className="text-center text-xs text-muted mb-6">Offline — stats are stored on this device only.</p>}

      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="flex flex-row items-center justify-center gap-2">
          <svg className="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 23c-4.97 0-8-3.58-8-8 0-2.52 1.14-4.62 2.4-6.28.9-1.19 1.94-2.28 2.82-3.2.32-.33.62-.65.88-.94C10.7 3.9 11.1 3 11.1 3s.66 1.5 1.62 3.13c.47.8 1.02 1.63 1.58 2.42.28-.5.52-1.06.7-1.55.14-.4.55-.6.92-.4C17.9 7.7 20 10.6 20 15c0 4.42-3.03 8-8 8zm0-2.5c1.66 0 3-1.34 3-3 0-.72-.3-1.5-.74-2.26-.4-.68-.9-1.32-1.36-1.9l-.9-1.14-.9 1.14c-.46.58-.96 1.22-1.36 1.9-.44.76-.74 1.54-.74 2.26 0 1.66 1.34 3 3 3z" />
          </svg>
          <span className="text-active text-2xl font-bold">{streak.data?.currentStreak ?? 0}</span>
          <span className="text-muted text-sm">Day Streak</span>
        </div>
        {streak.isFetching && <p className="text-xs text-muted">Loading streak…</p>}
        {streak.isError && <p className="text-xs text-muted">Couldn&apos;t load streak — try again later.</p>}
      </div>

      {stats.isFetching && <p className="text-center text-xs text-muted mb-8">Loading all-time stats…</p>}
      {stats.isError && <p className="text-center text-xs text-muted mb-8">Couldn&apos;t load all-time stats — try again later.</p>}
      {stats.data && (
        <div className="mb-8">
          <StatRow label="All-time Best">{stats.data.bestWpm} WPM</StatRow>
          <StatRow label="Games Played">{stats.data.gamesPlayed}</StatRow>
          <StatRow label="Total Words Typed">{stats.data.totalWordsTyped}</StatRow>
        </div>
      )}

      <p className="text-muted text-sm mb-1">WPM history — last {history.data?.length || 0} games</p>
      {history.isFetching && <p className="text-xs text-muted mb-2">Loading history…</p>}
      {history.isError && <p className="text-xs text-muted mb-2">Couldn&apos;t load history — try again later.</p>}
      <HistoryChart history={history.data ?? []} />
    </div>
  )
}
