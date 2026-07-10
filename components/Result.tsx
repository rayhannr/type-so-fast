import { SpeedCurve } from './SpeedCurve'
import { WpmBurst } from './WpmBurst'
import { KeyHeatmap } from './KeyHeatmap'
import { AccuracyBreakdown } from './AccuracyBreakdown'
import { ShareCard } from './ShareCard'
import { LevelBadge } from './LevelBadge'
import { levelFromXp } from '@/lib/progress'
import { useRecordsQuery, useSaveRecordsMutation } from '@/lib/queries/cloudsave'
import { useStatsQuery } from '@/lib/queries/statistics'
import { AgsSession } from '@/lib/queries/shared'
import { GameState } from '@/lib/gameReducer'

export interface XpGain {
  earned: number
  totalXp: number
  leveledUp: boolean
}

interface Props {
  state: GameState
  session: AgsSession | null
  displayName?: string
  xpGain: XpGain | null
}

const StatRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-row items-baseline justify-between py-2 border-b border-solid border-edge text-sm">
    <span className="text-muted">{label}</span>
    <span className="text-active font-medium">{children}</span>
  </div>
)

export const Result = ({ state, session, displayName, xpGain }: Props) => {
  const records = useRecordsQuery(session)
  const stats = useStatsQuery(session)
  const saveRecordsMutation = useSaveRecordsMutation(session)
  const clearRecords = () => saveRecordsMutation.mutate([])

  const wpm = Math.round((state.correctKeystroke * 12) / state.duration)
  const accuracy = ((state.correctKeystroke * 100) / (state.correctKeystroke + state.wrongKeystroke + state.correction)).toFixed(2)

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative text-center py-6">
        <WpmBurst wpm={wpm} />
        <p className="text-7xl md:text-8xl font-bold text-accent leading-none">{wpm}</p>
        <p className="text-muted mt-1">WPM</p>
      </div>

      {xpGain && (
        <div className="flex flex-col items-center gap-2 mb-6">
          {xpGain.leveledUp && (
            <p className="level-up text-accent font-bold text-lg">Level Up! You reached level {levelFromXp(xpGain.totalXp)}</p>
          )}
          <p className="text-active text-sm">+{xpGain.earned} XP</p>
          <LevelBadge xp={xpGain.totalXp} size="lg" />
        </div>
      )}

      <div>
        <StatRow label="Accuracy">{accuracy}%</StatRow>
        <StatRow label="Keystrokes">
          <span className="text-correct">{state.correctKeystroke}</span>
          <span className="text-muted"> / </span>
          <span className="text-error">{state.wrongKeystroke}</span>
          <span className="text-muted"> / </span>
          {state.correctKeystroke + state.wrongKeystroke}
        </StatRow>
        <StatRow label="Correct Words">
          <span className="text-correct">{state.correctWords}</span>
        </StatRow>
        <StatRow label="Wrong Words">
          <span className="text-error">{state.wrongWords}</span>
        </StatRow>
      </div>

      <div className="mt-6">
        <p className="text-muted text-sm mb-1">Personal Bests</p>
        {!records.data?.length ? (
          <p className="text-active text-sm">No records yet</p>
        ) : (
          <div className="flex flex-row flex-wrap items-baseline gap-x-4 gap-y-1">
            {records.data.slice(0, 5).map((record, index) => (
              <span key={index} className={index === 0 ? 'text-accent text-2xl font-bold' : 'text-active text-lg'}>
                {record} <span className="text-muted text-xs font-normal">WPM</span>
              </span>
            ))}
            <button
              type="button"
              onClick={clearRecords}
              className="ml-auto text-xs text-muted hover:text-error transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
        {stats.isFetching && <p className="mt-3 text-xs text-muted">Loading all-time stats…</p>}
        {stats.isError && <p className="mt-3 text-xs text-muted">Couldn&apos;t load all-time stats — try again later.</p>}
        {stats.data && (
          <div className="mt-3">
            <StatRow label="All-time Best">{stats.data.bestWpm} WPM</StatRow>
            <StatRow label="Games Played">{stats.data.gamesPlayed}</StatRow>
            <StatRow label="Total Words Typed">{stats.data.totalWordsTyped}</StatRow>
          </div>
        )}
      </div>

      <ShareCard wpm={wpm} accuracy={accuracy} duration={state.duration} displayName={displayName} />

      <SpeedCurve samples={state.wpmSamples} />
      <KeyHeatmap missMap={state.missMap} />
      <AccuracyBreakdown wordStats={state.wordStats} />
    </div>
  )
}
