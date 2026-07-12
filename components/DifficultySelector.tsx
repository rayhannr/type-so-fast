import { DIFFICULTIES, Difficulty } from '@/lib/botDifficulty'
import { SelectorButtons } from './SelectorButtons'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  legend: 'Legend'
}

type Props = {
  active: Difficulty
  disabled: boolean
  onChange: (difficulty: Difficulty) => void
}

export const DifficultySelector = ({ active, disabled, onChange }: Props) => (
  <SelectorButtons
    options={DIFFICULTIES}
    active={active}
    disabled={disabled}
    onChange={onChange}
    ariaLabel="Bot difficulty"
    getLabel={difficulty => DIFFICULTY_LABELS[difficulty]}
  />
)
