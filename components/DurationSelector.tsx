export const DURATIONS = [15, 30, 60, 120] as const
export type Duration = (typeof DURATIONS)[number]

type Props = {
  active: Duration
  disabled: boolean
  onChange: (duration: Duration) => void
}

export const DurationSelector = ({ active, disabled, onChange }: Props) => (
  <div className="flex flex-row justify-center gap-2" aria-label="Test duration">
    {DURATIONS.map((duration) => (
      <button
        key={duration}
        type="button"
        disabled={disabled}
        onClick={() => onChange(duration)}
        aria-current={active === duration ? 'true' : undefined}
        className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          active === duration ? 'text-accent bg-surface' : 'text-muted hover:text-active'
        }`}
      >
        {duration}s
      </button>
    ))}
  </div>
)
