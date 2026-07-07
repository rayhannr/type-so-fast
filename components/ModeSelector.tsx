import { WORD_MODES } from '@/lib/word-generators'
import type { WordMode } from '@/lib/word-generators'

const MODE_LABELS: Record<WordMode, string> = {
  words: 'Words',
  numbers: 'Numbers',
  punctuation: 'Punctuation',
}

type Props = {
  active: WordMode
  disabled: boolean
  onChange: (mode: WordMode) => void
}

export const ModeSelector = ({ active, disabled, onChange }: Props) => (
  <div className="flex flex-row justify-center gap-2" aria-label="Word mode">
    {WORD_MODES.map((mode) => (
      <button
        key={mode}
        type="button"
        disabled={disabled}
        onClick={() => onChange(mode)}
        aria-current={active === mode ? 'true' : undefined}
        className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          active === mode ? 'text-accent bg-surface' : 'text-muted hover:text-active'
        }`}
      >
        {MODE_LABELS[mode]}
      </button>
    ))}
  </div>
)
