type Props<T extends string | number> = {
  options: readonly T[]
  active: T
  onChange: (value: T) => void
  getLabel: (value: T) => string
  ariaLabel: string
  disabled?: boolean
}

export const SelectorButtons = <T extends string | number>({
  options,
  active,
  onChange,
  getLabel,
  ariaLabel,
  disabled = false
}: Props<T>) => (
  <div className="flex flex-row justify-center gap-2" aria-label={ariaLabel}>
    {options.map(option => (
      <button
        key={option}
        type="button"
        disabled={disabled}
        onClick={() => onChange(option)}
        aria-current={active === option ? 'true' : undefined}
        className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          active === option ? 'text-accent bg-surface' : 'text-muted hover:text-active'
        }`}
      >
        {getLabel(option)}
      </button>
    ))}
  </div>
)
