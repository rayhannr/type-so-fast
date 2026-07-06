interface Props {
  missMap: Record<string, number>
}

const ROWS: { keys: string[]; offset: number }[] = [
  { keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], offset: 0 },
  { keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], offset: 10 },
  { keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"], offset: 16 },
  { keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'], offset: 26 },
]

const KEY = 18
const GAP = 3
const PITCH = KEY + GAP
const W = 250
const H = PITCH * 5 - GAP
const SPACE_W = PITCH * 5 - GAP

// cool (blue) → hot (red) as miss frequency approaches the worst key
const heatColor = (count: number, max: number) => {
  if (count === 0) return 'var(--surface)'
  const t = count / max
  return `hsl(${Math.round(200 - 200 * t)} 70% 45%)`
}

export const KeyHeatmap = ({ missMap }: Props) => {
  const max = Math.max(1, ...Object.values(missMap))
  const misses = (key: string) => missMap[key] ?? 0

  const renderKey = (key: string, x: number, y: number, width: number = KEY) => {
    const count = misses(key)
    return (
      <g key={key}>
        <title>{`${key === ' ' ? 'space' : key} — ${count} ${count === 1 ? 'miss' : 'misses'}`}</title>
        <rect
          x={x}
          y={y}
          width={width}
          height={KEY}
          rx="3"
          fill={heatColor(count, max)}
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text
          x={x + width / 2}
          y={y + KEY / 2 + 3}
          textAnchor="middle"
          fontSize="8"
          fill={count > 0 ? '#ffffff' : 'var(--text-muted)'}
        >
          {key === ' ' ? '' : key}
        </text>
      </g>
    )
  }

  return (
    <div className="mt-8 w-full">
      <p className="text-muted text-sm mb-1">key misses</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label="Keyboard heatmap of missed keys, colored from cool to hot by miss frequency"
      >
        {ROWS.map((row, rowIndex) =>
          row.keys.map((key, keyIndex) => renderKey(key, row.offset + keyIndex * PITCH, rowIndex * PITCH))
        )}
        {renderKey(' ', (W - SPACE_W) / 2, PITCH * 4, SPACE_W)}
      </svg>
      {Object.keys(missMap).length === 0 && <p className="text-xs text-muted mt-1">no misses this game — flawless</p>}
    </div>
  )
}
