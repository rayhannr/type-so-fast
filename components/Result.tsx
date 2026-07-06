import { SpeedCurve } from './SpeedCurve'
import type { WpmSample } from './SpeedCurve'
import { WpmBurst } from './WpmBurst'
import { KeyHeatmap } from './KeyHeatmap'
import { AccuracyBreakdown } from './AccuracyBreakdown'
import type { WordStat } from './AccuracyBreakdown'
import { ShareCard } from './ShareCard'

interface PersonalStats {
  bestWpm: number
  gamesPlayed: number
  totalWordsTyped: number
}

interface Props {
  wpm: number
  correctKeystroke: number
  wrongKeystroke: number
  accuracy: string
  correctWords: number
  wrongWords: number
  personalStats?: PersonalStats | null
  records: number[]
  clearRecords: () => void
  samples: WpmSample[]
  missMap: Record<string, number>
  wordStats: WordStat[]
  duration: number
  displayName: string | null
}

const StatRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-row items-baseline justify-between py-2 border-b border-solid border-edge text-sm">
    <span className="text-muted">{label}</span>
    <span className="text-active font-medium">{children}</span>
  </div>
)

export const Result = ({
  wpm,
  correctKeystroke,
  wrongKeystroke,
  accuracy,
  correctWords,
  wrongWords,
  personalStats,
  records,
  clearRecords,
  samples,
  missMap,
  wordStats,
  duration,
  displayName,
}: Props) => (
  <div className="w-full max-w-md mx-auto">
    <div className="relative text-center py-6">
      <WpmBurst wpm={wpm} />
      <p className="text-7xl md:text-8xl font-bold text-accent leading-none">{wpm}</p>
      <p className="text-muted mt-1">WPM</p>
    </div>

    <div>
      <StatRow label="Accuracy">{accuracy}%</StatRow>
      <StatRow label="Keystrokes">
        <span className="text-correct">{correctKeystroke}</span>
        <span className="text-muted"> / </span>
        <span className="text-error">{wrongKeystroke}</span>
        <span className="text-muted"> / </span>
        {correctKeystroke + wrongKeystroke}
      </StatRow>
      <StatRow label="Correct Words">
        <span className="text-correct">{correctWords}</span>
      </StatRow>
      <StatRow label="Wrong Words">
        <span className="text-error">{wrongWords}</span>
      </StatRow>
    </div>

    <div className="mt-6">
      <p className="text-muted text-sm mb-1">Personal Bests</p>
      {records.length === 0 ? (
        <p className="text-active text-sm">No records yet</p>
      ) : (
        <div className="flex flex-row items-baseline gap-4">
          {records.map((record, index) => (
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
      {personalStats && (
        <div className="mt-3">
          <StatRow label="All-time Best">{personalStats.bestWpm} WPM</StatRow>
          <StatRow label="Games Played">{personalStats.gamesPlayed}</StatRow>
          <StatRow label="Total Words Typed">{personalStats.totalWordsTyped}</StatRow>
        </div>
      )}
    </div>

    <ShareCard wpm={wpm} accuracy={accuracy} duration={duration} displayName={displayName} />

    <SpeedCurve samples={samples} />
    <KeyHeatmap missMap={missMap} />
    <AccuracyBreakdown wordStats={wordStats} />
  </div>
)
