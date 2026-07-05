'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three'

export interface CaretPosition {
  x: number
  y: number
}

interface Props {
  caretRef: RefObject<CaretPosition>
  wpm: number
  wrongKeystroke: number
}

const POOL_SIZE = 240
const EMBER_DIM = new Color('#8a6f0e')
const EMBER_BRIGHT = new Color('#ffe066')
const PULSE_COLOR = new Color('#ca4754')

const VERTEX_SHADER = `
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aSize;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    gl_PointSize = aSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float falloff = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, vAlpha * falloff);
  }
`

// glowing embers that follow the caret; faster correct typing = brighter trail,
// a wrong keystroke fires a brief red pulse burst at the caret position
export const CaretTrail = ({ caretRef, wpm, wrongKeystroke }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wpmRef = useRef(wpm)
  const pulseRef = useRef<(() => void) | null>(null)
  const prevWrongRef = useRef(wrongKeystroke)

  wpmRef.current = wpm

  useEffect(() => {
    if (wrongKeystroke > prevWrongRef.current) {
      pulseRef.current?.()
    }
    prevWrongRef.current = wrongKeystroke
  }, [wrongKeystroke])

  useEffect(() => {
    const container = containerRef.current
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const isLightTheme = () => document.documentElement.getAttribute('data-theme') === 'light'

    const scene = new Scene()
    // pixel-space camera matching DOM coordinates (y grows downward)
    const camera = new OrthographicCamera(0, container.clientWidth, 0, container.clientHeight, -10, 10)
    camera.position.z = 1

    const renderer = new WebGLRenderer({ alpha: true, antialias: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    container.appendChild(renderer.domElement)

    const positions = new Float32Array(POOL_SIZE * 3)
    const colors = new Float32Array(POOL_SIZE * 3)
    const alphas = new Float32Array(POOL_SIZE)
    const sizes = new Float32Array(POOL_SIZE)
    const velocities = new Float32Array(POOL_SIZE * 2)
    const life = new Float32Array(POOL_SIZE)
    const maxLife = new Float32Array(POOL_SIZE)

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aColor', new BufferAttribute(colors, 3))
    geometry.setAttribute('aAlpha', new BufferAttribute(alphas, 1))
    geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))

    const material = new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: isLightTheme() ? NormalBlending : AdditiveBlending,
    })
    scene.add(new Points(geometry, material))

    let cursor = 0
    const ember = new Color()

    const spawn = (x: number, y: number, color: Color, speed: number, size: number, lifeSeconds: number) => {
      const i = cursor
      cursor = (cursor + 1) % POOL_SIZE
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = 0
      const angle = Math.random() * Math.PI * 2
      velocities[i * 2] = Math.cos(angle) * speed * (0.3 + Math.random() * 0.7)
      velocities[i * 2 + 1] = Math.sin(angle) * speed * 0.4 - (12 + Math.random() * 22) // embers drift upward
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
      sizes[i] = size * (0.7 + Math.random() * 0.6)
      maxLife[i] = lifeSeconds * (0.7 + Math.random() * 0.6)
      life[i] = maxLife[i]
    }

    pulseRef.current = () => {
      const { x, y } = caretRef.current
      for (let n = 0; n < 16; n++) {
        spawn(x, y, PULSE_COLOR, 90, 7, 0.45)
      }
    }

    let frameId = 0
    let lastTime = performance.now()
    const lastCaret = { x: -1, y: -1 }

    const animate = (now: number) => {
      frameId = requestAnimationFrame(animate)
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const { x, y } = caretRef.current
      const moved = Math.abs(x - lastCaret.x) > 0.5 || Math.abs(y - lastCaret.y) > 0.5
      if (moved && lastCaret.x >= 0) {
        const heat = Math.min(wpmRef.current, 120) / 120
        ember.copy(EMBER_DIM).lerp(EMBER_BRIGHT, heat)
        const count = 4 + Math.round(heat * 6)
        for (let n = 0; n < count; n++) {
          // scatter along the caret's path so fast jumps leave a continuous trail
          const t = Math.random()
          spawn(lastCaret.x + (x - lastCaret.x) * t, lastCaret.y + (y - lastCaret.y) * t, ember, 20, 5 + heat * 4, 0.9)
        }
      }
      lastCaret.x = x
      lastCaret.y = y

      material.blending = isLightTheme() ? NormalBlending : AdditiveBlending

      for (let i = 0; i < POOL_SIZE; i++) {
        if (life[i] <= 0) {
          alphas[i] = 0
          continue
        }
        life[i] -= dt
        positions[i * 3] += velocities[i * 2] * dt
        positions[i * 3 + 1] += velocities[i * 2 + 1] * dt
        velocities[i * 2 + 1] += 10 * dt // gentle deceleration of the rise
        alphas[i] = Math.max(life[i] / maxLife[i], 0)
      }

      geometry.attributes.position.needsUpdate = true
      geometry.attributes.aColor.needsUpdate = true
      geometry.attributes.aAlpha.needsUpdate = true
      geometry.attributes.aSize.needsUpdate = true
      renderer.render(scene, camera)
    }
    frameId = requestAnimationFrame(animate)

    const resizeObserver = new ResizeObserver(() => {
      camera.right = container.clientWidth
      camera.bottom = container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    })
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      pulseRef.current = null
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [caretRef])

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true" />
}
