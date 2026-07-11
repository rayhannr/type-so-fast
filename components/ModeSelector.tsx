import { WORD_MODES, WordMode } from '@/lib/word-generators'
import { SelectorButtons } from './SelectorButtons'

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
  <SelectorButtons
    options={WORD_MODES}
    active={active}
    disabled={disabled}
    onChange={onChange}
    ariaLabel="Word mode"
    getLabel={(mode) => MODE_LABELS[mode]}
  />
)
