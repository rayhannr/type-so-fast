'use client'

import { useMemo, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

export interface WpmSample {
  elapsed: number
  wpm: number
}

interface Props {
  samples: WpmSample[]
}

const W = 288
const H = 170
const M = { top: 16, right: 16, bottom: 24, left: 32 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom
const GAME_DURATION = 60

export const SpeedCurve = ({ samples }: Props) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const points = useMemo(() => [{ elapsed: 0, wpm: 0 }, ...samples], [samples])

  const yMax = useMemo(() => {
    const max = Math.max(...points.map((p) => p.wpm))
    return Math.max(40, Math.ceil(max / 20) * 20)
  }, [points])

  if (samples.length < 2) return null

  const x = (elapsed: number) => M.left + (elapsed / GAME_DURATION) * PLOT_W
  const y = (wpm: number) => M.top + PLOT_H - (wpm / yMax) * PLOT_H

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.elapsed)},${y(p.wpm)}`).join(' ')
  const areaPath = `${linePath} L${x(points[points.length - 1].elapsed)},${y(0)} L${x(0)},${y(0)} Z`

  const yTicks = [0, 1, 2, 3, 4].map((i) => (yMax / 4) * i)
  const xTicks = [0, 15, 30, 45, 60]
  const lastPoint = points[points.length - 1]

  const pointFromClientX = (clientX: number, rect: DOMRect) => {
    const viewX = ((clientX - rect.left) / rect.width) * W
    let nearest = 0
    let nearestDistance = Infinity
    points.forEach((p, i) => {
      const distance = Math.abs(x(p.elapsed) - viewX)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = i
      }
    })
    return nearest
  }

  const pointerHandler = (event: PointerEvent<SVGSVGElement>) => {
    setHoverIndex(pointFromClientX(event.clientX, event.currentTarget.getBoundingClientRect()))
  }

  const keyHandler = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const delta = event.key === 'ArrowLeft' ? -1 : 1
    setHoverIndex((prev) => Math.min(points.length - 1, Math.max(0, (prev ?? points.length - 1) + delta)))
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <div className="mt-8 w-full">
      <p className="text-muted text-sm mb-1">Speed Curve</p>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block focus:outline-none focus:ring-1 focus:ring-accent rounded"
          role="img"
          aria-label="Words per minute over the 60 second game, sampled every 5 seconds"
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
          {xTicks.map((tick) => (
            <text key={tick} x={x(tick)} y={H - M.bottom + 14} textAnchor="middle" fontSize="9" fill="var(--text-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {tick}s
            </text>
          ))}
          <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} stroke="var(--border)" strokeWidth="1" />

          <path d={areaPath} fill="var(--accent)" fillOpacity="0.12" />
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {hovered && (
            <line x1={x(hovered.elapsed)} x2={x(hovered.elapsed)} y1={M.top} y2={y(0)} stroke="var(--border)" strokeWidth="1" />
          )}
          {hovered && <circle cx={x(hovered.elapsed)} cy={y(hovered.wpm)} r="4" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />}

          <circle cx={x(lastPoint.elapsed)} cy={y(lastPoint.wpm)} r="4" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />
          <text
            x={x(lastPoint.elapsed) - 6}
            y={y(lastPoint.wpm) - 8}
            textAnchor="end"
            fontSize="10"
            fontWeight="700"
            fill="var(--text-active)"
          >
            {lastPoint.wpm} WPM
          </text>
        </svg>

        {hovered && (
          <div
            className="absolute pointer-events-none bg-surface text-active border border-solid border-edge text-xs rounded px-2 py-1 whitespace-nowrap"
            style={{
              left: `${(x(hovered.elapsed) / W) * 100}%`,
              top: 0,
              transform: `translateX(${hovered.elapsed > GAME_DURATION * 0.75 ? '-100%' : hovered.elapsed < GAME_DURATION * 0.25 ? '0' : '-50%'})`,
            }}
          >
            <span className="font-bold">{hovered.wpm} WPM</span> <span className="text-muted">at {hovered.elapsed}s</span>
          </div>
        )}

        <table className="sr-only">
          <caption>Words per minute over time</caption>
          <thead>
            <tr>
              <th>Seconds elapsed</th>
              <th>WPM</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.elapsed}>
                <td>{p.elapsed}</td>
                <td>{p.wpm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
