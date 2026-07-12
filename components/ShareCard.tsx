'use client'

import { useState } from 'react'

interface Props {
  wpm: number
  accuracy: string
  duration: number
  displayName?: string
}

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630

const renderCard = ({ wpm, accuracy, duration, displayName }: Props): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')!

  // the card is a share asset, so it always uses the dark palette regardless of theme
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e2b714'
  const font = (size: number, weight = 400) => `${weight} ${size}px Inter, ui-sans-serif, system-ui, sans-serif`

  ctx.fillStyle = '#111111'
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  ctx.strokeStyle = '#2b2d31'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, CARD_WIDTH - 2, CARD_HEIGHT - 2)
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, CARD_WIDTH, 8)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = accent
  ctx.font = font(44, 700)
  ctx.fillText('TypeSoFast!', 80, 116)
  ctx.fillStyle = '#646669'
  ctx.font = font(26)
  ctx.fillText('How fast can you type?', 80, 158)

  ctx.fillStyle = accent
  ctx.font = font(230, 800)
  ctx.fillText(String(wpm), 74, 420)
  const wpmWidth = ctx.measureText(String(wpm)).width
  ctx.fillStyle = '#646669'
  ctx.font = font(48, 500)
  ctx.fillText('WPM', 74 + wpmWidth + 28, 420)

  const stats: [string, string][] = [
    ['accuracy', `${accuracy}%`],
    ['duration', `${duration}s`],
    ['date', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })]
  ]
  let x = 80
  for (const [label, value] of stats) {
    ctx.fillStyle = '#646669'
    ctx.font = font(24)
    ctx.fillText(label, x, 508)
    ctx.fillStyle = '#e2e8f0'
    ctx.font = font(40, 600)
    ctx.fillText(value, x, 556)
    x += Math.max(ctx.measureText(value).width, 140) + 70
  }

  ctx.fillStyle = '#e2e8f0'
  ctx.font = font(28, 500)
  ctx.textAlign = 'right'
  ctx.fillText(displayName ?? 'anonymous', CARD_WIDTH - 80, 116)
  ctx.textAlign = 'left'

  return canvas
}

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png')
  })

export const ShareCard = (props: Props) => {
  const [feedback, setFeedback] = useState<string | null>(null)

  const flash = (message: string) => {
    setFeedback(message)
    setTimeout(() => setFeedback(null), 2000)
  }

  const download = async () => {
    const blob = await toBlob(renderCard(props))
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `typesofast-${props.wpm}wpm.png`
    link.click()
    URL.revokeObjectURL(url)
    flash('Downloaded')
  }

  const copy = async () => {
    try {
      const blob = await toBlob(renderCard(props))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      flash('Copied to clipboard')
    } catch {
      flash('Copy not supported here')
    }
  }

  return (
    <div className="flex flex-row items-center justify-center gap-3 mt-6">
      <span className="text-muted text-sm">Share</span>
      <button
        type="button"
        onClick={download}
        className="text-xs text-active border border-solid border-edge rounded px-2 py-1 hover:border-accent hover:text-accent transition-colors cursor-pointer"
      >
        Download PNG
      </button>
      <button
        type="button"
        onClick={copy}
        className="text-xs text-active border border-solid border-edge rounded px-2 py-1 hover:border-accent hover:text-accent transition-colors cursor-pointer"
      >
        Copy image
      </button>
      {feedback && <span className="text-xs text-accent">{feedback}</span>}
    </div>
  )
}
