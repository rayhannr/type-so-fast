'use client'

import { useMemo, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { GameHistoryEntry } from '@/lib/progress'
import { HISTORY_LIMIT } from '@/lib/progress'

interface Props {
  history: GameHistoryEntry[]
}

const W = 288
const H = 170
const M = { top: 16, right: 16, bottom: 24, left: 32 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export const HistoryChart = ({ history }: Props) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const yMax = useMemo(() => {
    const max = Math.max(0, ...history.map((entry) => entry.wpm))
    return Math.max(40, Math.ceil(max / 20) * 20)
  }, [history])

  if (history.length < 2) {
    return <p className="text-sm text-muted">Play at least two games to see your progress over time.</p>
  }

  const x = (index: number) => M.left + (index / (history.length - 1)) * PLOT_W
  const y = (wpm: number) => M.top + PLOT_H - (wpm / yMax) * PLOT_H

  const linePath = history.map((entry, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(entry.wpm)}`).join(' ')
  const areaPath = `${linePath} L${x(history.length - 1)},${y(0)} L${x(0)},${y(0)} Z`

  const yTicks = [0, 1, 2, 3, 4].map((i) => (yMax / 4) * i)
  const lastPoint = history[history.length - 1]

  const indexFromClientX = (clientX: number, rect: DOMRect) => {
    const viewX = ((clientX - rect.left) / rect.width) * W
    const raw = Math.round(((viewX - M.left) / PLOT_W) * (history.length - 1))
    return Math.min(history.length - 1, Math.max(0, raw))
  }

  const pointerHandler = (event: PointerEvent<SVGSVGElement>) => {
    setHoverIndex(indexFromClientX(event.clientX, event.currentTarget.getBoundingClientRect()))
  }

  const keyHandler = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const delta = event.key === 'ArrowLeft' ? -1 : 1
    setHoverIndex((prev) => Math.min(history.length - 1, Math.max(0, (prev ?? history.length - 1) + delta)))
  }

  const hovered = hoverIndex !== null ? history[hoverIndex] : null
  const hoveredX = hoverIndex !== null ? x(hoverIndex) : 0

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block focus:outline-none focus:ring-1 focus:ring-accent rounded"
        role="img"
        aria-label={`Words per minute across your last ${history.length} games`}
        tabIndex={0}
        onPointerMove={pointerHandler}
        onPointerLeave={() => setHoverIndex(null)}
        onKeyDown={keyHandler}
        onBlur={() => setHoverIndex(null)}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth="1" />
            <text x={M.left - 6} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {tick}
            </text>
          </g>
        ))}
        <text x={M.left} y={H - M.bottom + 14} textAnchor="start" fontSize="9" fill="var(--text-muted)">
          {formatDate(history[0].timestamp)}
        </text>
        <text x={W - M.right} y={H - M.bottom + 14} textAnchor="end" fontSize="9" fill="var(--text-muted)">
          {formatDate(lastPoint.timestamp)}
        </text>
        <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} stroke="var(--border)" strokeWidth="1" />

        <path d={areaPath} fill="var(--accent)" fillOpacity="0.12" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {hovered && <line x1={hoveredX} x2={hoveredX} y1={M.top} y2={y(0)} stroke="var(--border)" strokeWidth="1" />}
        {hovered && <circle cx={hoveredX} cy={y(hovered.wpm)} r="4" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />}

        <circle cx={x(history.length - 1)} cy={y(lastPoint.wpm)} r="4" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />
      </svg>

      {hovered && (
        <div
          className="absolute pointer-events-none bg-surface text-active border border-solid border-edge text-xs rounded px-2 py-1 whitespace-nowrap"
          style={{
            left: `${(hoveredX / W) * 100}%`,
            top: 0,
            transform: `translateX(${hoverIndex! > (history.length - 1) * 0.75 ? '-100%' : hoverIndex! < (history.length - 1) * 0.25 ? '0' : '-50%'})`,
          }}
        >
          <span className="font-bold">{hovered.wpm} WPM</span>{' '}
          <span className="text-muted">on {formatDate(hovered.timestamp)}</span>
        </div>
      )}

      <table className="sr-only">
        <caption>Words per minute for your last {HISTORY_LIMIT} games</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>WPM</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr key={entry.timestamp}>
              <td>{formatDate(entry.timestamp)}</td>
              <td>{entry.wpm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
