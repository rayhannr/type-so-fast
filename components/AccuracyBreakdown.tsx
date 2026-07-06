export interface WordStat {
  word: string
  correct: number
  attempted: number
}

interface Props {
  wordStats: WordStat[]
}

const colorFor = (accuracy: number) => {
  if (accuracy >= 0.9) return 'text-correct'
  if (accuracy >= 0.6) return 'text-accent'
  return 'text-error'
}

export const AccuracyBreakdown = ({ wordStats }: Props) => {
  if (wordStats.length === 0) return null

  return (
    <div className="mt-8 w-full">
      <p className="text-muted text-sm mb-1">Word Accuracy</p>
      <div className="max-h-40 overflow-y-auto flex flex-wrap gap-x-3 gap-y-1 text-sm leading-6">
        {wordStats.map((stat, index) => {
          const accuracy = stat.attempted > 0 ? stat.correct / stat.attempted : 0
          const missCount = stat.attempted - stat.correct
          return (
            <span
              key={`${stat.word}-${index}`}
              className={`${colorFor(accuracy)} cursor-default`}
              title={`${Math.round(accuracy * 100)}% — ${missCount} ${missCount === 1 ? 'miss' : 'misses'}`}
            >
              {stat.word}
            </span>
          )
        })}
      </div>
    </div>
  )
}
