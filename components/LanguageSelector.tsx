import { LANGUAGES, Language } from '@/constants/words'

const LANGUAGE_LABELS: Record<Language, string> = {
  indonesian: 'Indonesian',
  english: 'English',
}

type Props = {
  active: Language
  disabled: boolean
  onChange: (language: Language) => void
}

export const LanguageSelector = ({ active, disabled, onChange }: Props) => (
  <select
    value={active}
    disabled={disabled}
    onChange={(event) => onChange(event.target.value as Language)}
    aria-label="Language"
    className="rounded-md border border-solid border-edge bg-surface px-2.5 py-1 text-xs text-active cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:border-accent transition-colors"
  >
    {LANGUAGES.map((language) => (
      <option key={language} value={language}>
        {LANGUAGE_LABELS[language]}
      </option>
    ))}
  </select>
)
