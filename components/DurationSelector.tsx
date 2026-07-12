import { SelectorButtons } from './SelectorButtons'

export const DURATIONS = [15, 30, 60, 120] as const
export type Duration = (typeof DURATIONS)[number]

type Props = {
  active: Duration
  disabled: boolean
  onChange: (duration: Duration) => void
}

export const DurationSelector = ({ active, disabled, onChange }: Props) => (
  <SelectorButtons
    options={DURATIONS}
    active={active}
    disabled={disabled}
    onChange={onChange}
    ariaLabel="Test duration"
    getLabel={duration => `${duration}s`}
  />
)
