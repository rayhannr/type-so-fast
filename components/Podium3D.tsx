'use client'

import { useEffect, useState, useRef } from 'react'
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Sprite,
  SpriteMaterial,
  WebGLRenderer,
} from 'three'

interface Props {
  records: number[]
  labels?: string[]
}

const CANVAS_WIDTH = 320
const CANVAS_HEIGHT = 200
const MAX_COLUMN_HEIGHT = 2.2

// rank order: [gold, silver, bronze] → screen order silver, gold, bronze
const COLUMN_STYLES = [
  { x: 0, color: 0xd9a520, delay: 0.5 },
  { x: -1.25, color: 0xb8bfc9, delay: 0.25 },
  { x: 1.25, color: 0xc4763a, delay: 0 },
]

const makeLabelSprite = (title: string, subtitle: string | undefined, color: string) => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'
  ctx.fillStyle = color
  if (subtitle) {
    ctx.font = '600 30px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(subtitle.slice(0, 14), 128, 36)
    ctx.font = '700 38px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.fillText(title, 128, 82)
  } else {
    ctx.font = '700 44px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, 128, 48)
  }

  const material = new SpriteMaterial({ map: new CanvasTexture(canvas), transparent: true, opacity: 0 })
  const sprite = new Sprite(material)
  sprite.scale.set(1.5, 0.56, 1)
  return sprite
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export const Podium3D = ({ records, labels }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // bumped when data-theme changes so labels get redrawn in the new text color
  const [themeTick, setThemeTick] = useState(0)

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((tick) => tick + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || records.length === 0) return

    const labelColor = getComputedStyle(document.documentElement).getPropertyValue('--text-active').trim() || '#e2e8f0'

    const scene = new Scene()
    const camera = new PerspectiveCamera(40, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 100)
    camera.position.set(0, 2.6, 5.4)
    camera.lookAt(0, 1.1, 0)

    const renderer = new WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    scene.add(new AmbientLight(0xffffff, 1.1))
    const keyLight = new DirectionalLight(0xffffff, 1.6)
    keyLight.position.set(2, 4, 3)
    scene.add(keyLight)

    const group = new Group()
    scene.add(group)

    const maxRecord = records[0]
    const columns = records.slice(0, 3).map((record, rank) => {
      const { x, color, delay } = COLUMN_STYLES[rank]
      const height = 0.5 + (MAX_COLUMN_HEIGHT - 0.5) * (record / maxRecord)

      const geometry = new BoxGeometry(0.9, height, 0.9)
      geometry.translate(0, height / 2, 0)
      const material = new MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.35 })
      const mesh = new Mesh(geometry, material)
      mesh.position.x = x
      mesh.scale.y = 0.0001
      group.add(mesh)

      const label = makeLabelSprite(`${record} WPM`, labels?.[rank], labelColor)
      label.position.set(x, 0.35, 0)
      group.add(label)

      return { mesh, label, height, delay, geometry, material }
    })

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frameId = 0
    const start = performance.now()

    const renderFrame = (now: number) => {
      const t = (now - start) / 1000

      columns.forEach(({ mesh, label, height, delay }, rank) => {
        const progress = reducedMotion ? 1 : Math.min(Math.max((t - delay) / 0.8, 0), 1)
        const eased = easeOutCubic(progress)
        mesh.scale.y = Math.max(eased, 0.0001)
        label.material.opacity = eased
        const bob = reducedMotion ? 0 : Math.sin(t * 2 + rank) * 0.04
        label.position.y = height * eased + 0.35 + bob
      })

      group.rotation.y = reducedMotion ? 0 : Math.sin(t * 0.4) * 0.1
      renderer.render(scene, camera)
    }

    if (reducedMotion) {
      renderFrame(start)
    } else {
      const animate = (now: number) => {
        frameId = requestAnimationFrame(animate)
        renderFrame(now)
      }
      frameId = requestAnimationFrame(animate)
    }

    return () => {
      cancelAnimationFrame(frameId)
      columns.forEach(({ geometry, material, label }) => {
        geometry.dispose()
        material.dispose()
        label.material.map?.dispose()
        label.material.dispose()
      })
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [records, labels, themeTick])

  return (
    <div
      ref={containerRef}
      className="mx-auto"
      style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      role="img"
      aria-label={`Top records podium: ${records
        .map((record, i) => `${i + 1}. ${labels?.[i] ? `${labels[i]} — ` : ''}${record} WPM`)
        .join(', ')}`}
    />
  )
}
