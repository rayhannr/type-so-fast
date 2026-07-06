import { levelProgress } from '@/lib/progress'

type Props = {
  xp: number
  size?: 'sm' | 'lg'
}

export const LevelBadge = ({ xp, size = 'sm' }: Props) => {
  const { level, current, required } = levelProgress(xp)
  const fill = Math.min(100, (current / required) * 100)

  return (
    <div
      className={`flex flex-row items-center ${size === 'sm' ? 'gap-2' : 'gap-3'}`}
      title={`${current} / ${required} XP to level ${level + 1}`}
      aria-label={`Level ${level}, ${current} of ${required} XP to next level`}
    >
      <span className={`text-accent font-semibold ${size === 'sm' ? 'text-xs' : 'text-base'}`}>Lv {level}</span>
      <div className={`rounded-full bg-surface overflow-hidden ${size === 'sm' ? 'w-14 h-1' : 'w-40 h-1.5'}`}>
        <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${fill}%` }} />
      </div>
      {size === 'lg' && (
        <span className="text-muted text-xs">
          {current} / {required} XP
        </span>
      )}
    </div>
  )
}
