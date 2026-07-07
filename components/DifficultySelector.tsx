import { DIFFICULTIES } from '@/lib/botDifficulty'
import type { Difficulty } from '@/lib/botDifficulty'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  legend: 'Legend',
}

type Props = {
  active: Difficulty
  disabled: boolean
  onChange: (difficulty: Difficulty) => void
}

export const DifficultySelector = ({ active, disabled, onChange }: Props) => (
  <div className="flex flex-row justify-center gap-2" aria-label="Bot difficulty">
    {DIFFICULTIES.map((difficulty) => (
      <button
        key={difficulty}
        type="button"
        disabled={disabled}
        onClick={() => onChange(difficulty)}
        aria-current={active === difficulty ? 'true' : undefined}
        className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          active === difficulty ? 'text-accent bg-surface' : 'text-muted hover:text-active'
        }`}
      >
        {DIFFICULTY_LABELS[difficulty]}
      </button>
    ))}
  </div>
)
