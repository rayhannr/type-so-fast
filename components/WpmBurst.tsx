'use client'

import { useEffect, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  OrthographicCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer
} from 'three'

interface Props {
  wpm: number
}

const WIDTH = 320
const HEIGHT = 240
const LIFETIME = 1.4

const LOW_COLORS = ['#646669', '#8a6f0e', '#a58910']
const HIGH_COLORS = ['#e2b714', '#ffd83d', '#fff2b0']

// one-shot particle explosion from the WPM number when the result screen reveals;
// particle color and density scale with the score
export const WpmBurst = ({ wpm }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const scene = new Scene()
    const camera = new OrthographicCamera(0, WIDTH, 0, HEIGHT, -10, 10)
    camera.position.z = 1

    const renderer = new WebGLRenderer({ alpha: true, antialias: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(WIDTH, HEIGHT)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const intensity = Math.min(wpm, 120) / 120
    const count = Math.round(50 + intensity * 200)
    const palette = intensity > 0.4 ? HIGH_COLORS : LOW_COLORS

    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 2)

    const color = new Color()
    for (let i = 0; i < count; i++) {
      positions[i * 3] = WIDTH / 2
      positions[i * 3 + 1] = HEIGHT / 2
      positions[i * 3 + 2] = 0
      const angle = Math.random() * Math.PI * 2
      const speed = (60 + Math.random() * 180) * (0.5 + intensity * 0.8)
      velocities[i * 2] = Math.cos(angle) * speed
      velocities[i * 2 + 1] = Math.sin(angle) * speed
      color.set(palette[i % palette.length])
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('color', new BufferAttribute(colors, 3))

    const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light'
    const material = new PointsMaterial({
      size: 3.5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      sizeAttenuation: false,
      blending: isLightTheme ? NormalBlending : AdditiveBlending
    })
    scene.add(new Points(geometry, material))

    let frameId = 0
    const start = performance.now()
    let lastTime = start

    const animate = (now: number) => {
      const elapsed = (now - start) / 1000
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      if (elapsed >= LIFETIME) {
        renderer.render(scene, camera)
        return
      }
      frameId = requestAnimationFrame(animate)

      for (let i = 0; i < count; i++) {
        positions[i * 3] += velocities[i * 2] * dt
        positions[i * 3 + 1] += velocities[i * 2 + 1] * dt
        velocities[i * 2] *= 1 - 1.5 * dt
        velocities[i * 2 + 1] = velocities[i * 2 + 1] * (1 - 1.5 * dt) + 60 * dt // slight gravity
      }
      material.opacity = 1 - elapsed / LIFETIME

      geometry.attributes.position.needsUpdate = true
      renderer.render(scene, camera)
    }
    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [wpm])

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ width: WIDTH, height: HEIGHT }}
      aria-hidden="true"
    />
  )
}
