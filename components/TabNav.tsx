export type Tab = 'type' | 'leaderboard' | 'achievements'

const TABS: Tab[] = ['type', 'leaderboard', 'achievements']

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

export const TabNav = ({ active, onChange }: Props) => (
  <nav className="flex flex-row justify-center gap-6 md:gap-8 mt-8" aria-label="Sections">
    {TABS.map((tab) => (
      <button
        key={tab}
        type="button"
        onClick={() => onChange(tab)}
        aria-current={active === tab ? 'page' : undefined}
        className={`pb-1 text-sm border-b-2 border-solid transition-colors cursor-pointer ${
          active === tab ? 'text-active border-accent' : 'text-muted border-transparent hover:text-active'
        }`}
      >
        {tab}
      </button>
    ))}
  </nav>
)
