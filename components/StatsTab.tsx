import { HistoryChart } from './HistoryChart'
import type { GameHistoryEntry, StreakData } from '@/lib/progress'
import type { PersonalStats } from '@/lib/ags/statistics'

interface Props {
  personalStats: PersonalStats | null
  history: GameHistoryEntry[]
  streak: StreakData | null
  isLoggedIn: boolean
}

const StatRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-row items-baseline justify-between py-2 border-b border-solid border-edge text-sm">
    <span className="text-muted">{label}</span>
    <span className="text-active font-medium">{children}</span>
  </div>
)

export const StatsTab = ({ personalStats, history, streak, isLoggedIn }: Props) => (
  <div className="w-full max-w-md mx-auto mt-10">
    <h2 className="text-muted text-sm mb-6 text-center">Stats</h2>
    {!isLoggedIn && (
      <p className="text-center text-xs text-muted mb-6">Offline — stats are stored on this device only.</p>
    )}

    <div className="flex flex-row items-center justify-center gap-2 mb-8">
      <svg className="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 23c-4.97 0-8-3.58-8-8 0-2.52 1.14-4.62 2.4-6.28.9-1.19 1.94-2.28 2.82-3.2.32-.33.62-.65.88-.94C10.7 3.9 11.1 3 11.1 3s.66 1.5 1.62 3.13c.47.8 1.02 1.63 1.58 2.42.28-.5.52-1.06.7-1.55.14-.4.55-.6.92-.4C17.9 7.7 20 10.6 20 15c0 4.42-3.03 8-8 8zm0-2.5c1.66 0 3-1.34 3-3 0-.72-.3-1.5-.74-2.26-.4-.68-.9-1.32-1.36-1.9l-.9-1.14-.9 1.14c-.46.58-.96 1.22-1.36 1.9-.44.76-.74 1.54-.74 2.26 0 1.66 1.34 3 3 3z" />
      </svg>
      <span className="text-active text-2xl font-bold">{streak?.currentStreak ?? 0}</span>
      <span className="text-muted text-sm">Day Streak</span>
    </div>

    {personalStats && (
      <div className="mb-8">
        <StatRow label="All-time Best">{personalStats.bestWpm} WPM</StatRow>
        <StatRow label="Games Played">{personalStats.gamesPlayed}</StatRow>
        <StatRow label="Total Words Typed">{personalStats.totalWordsTyped}</StatRow>
      </div>
    )}

    <p className="text-muted text-sm mb-1">WPM history — last {history.length || 0} games</p>
    <HistoryChart history={history} />
  </div>
)
