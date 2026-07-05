'use client'

import { useEffect, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Color, LineBasicMaterial, LineSegments, PerspectiveCamera, Scene, WebGLRenderer } from 'three'

interface Props {
  wpm: number
  gameOver: boolean
}

const STAR_COUNT = 350
const DEPTH = 60
const SPREAD = 24
const BASE_COLOR = new Color('#646669')
const WARP_COLOR = new Color('#e2b714')

// speed-warp star field: star velocity maps directly to live WPM —
// calm drift at low WPM, near-warp streaks at high WPM
export const ParticleField = ({ wpm, gameOver }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const paramsRef = useRef({ wpm, gameOver })

  paramsRef.current = { wpm, gameOver }

  useEffect(() => {
    const container = containerRef.current
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const scene = new Scene()
    const camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, DEPTH + 5)
    camera.position.z = 0

    const renderer = new WebGLRenderer({ alpha: true, antialias: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    // each star is a line segment from its position to a speed-scaled tail,
    // so higher velocity draws longer streaks
    const stars = new Float32Array(STAR_COUNT * 3)
    const positions = new Float32Array(STAR_COUNT * 2 * 3)
    const colors = new Float32Array(STAR_COUNT * 2 * 3)

    const resetStar = (i: number, z?: number) => {
      stars[i * 3] = (Math.random() * 2 - 1) * SPREAD
      stars[i * 3 + 1] = (Math.random() * 2 - 1) * SPREAD
      stars[i * 3 + 2] = z ?? -DEPTH * Math.random()
    }
    for (let i = 0; i < STAR_COUNT; i++) resetStar(i)

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('color', new BufferAttribute(colors, 3))

    const material = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
    scene.add(new LineSegments(geometry, material))

    const starColor = new Color()
    let speed = 2
    let frameId = 0
    let lastTime = performance.now()

    const animate = (now: number) => {
      frameId = requestAnimationFrame(animate)
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const { wpm: currentWpm, gameOver: over } = paramsRef.current
      const heat = Math.min(currentWpm, 120) / 120
      const targetSpeed = over ? 0.6 : 2 + heat * 55
      speed += (targetSpeed - speed) * 1.5 * dt

      const streak = Math.min(speed * 0.04, 2.5)
      starColor.copy(BASE_COLOR).lerp(WARP_COLOR, Math.min(speed / 57, 1) * 0.8)
      const targetOpacity = over ? 0.2 : 0.5
      material.opacity += (targetOpacity - material.opacity) * 1.5 * dt

      for (let i = 0; i < STAR_COUNT; i++) {
        stars[i * 3 + 2] += speed * dt
        if (stars[i * 3 + 2] > -0.5) resetStar(i, -DEPTH)

        const x = stars[i * 3]
        const y = stars[i * 3 + 1]
        const z = stars[i * 3 + 2]

        positions[i * 6] = x
        positions[i * 6 + 1] = y
        positions[i * 6 + 2] = z
        positions[i * 6 + 3] = x
        positions[i * 6 + 4] = y
        positions[i * 6 + 5] = z - streak

        // depth fade: distant stars dimmer
        const fade = 1 - -z / DEPTH
        for (let v = 0; v < 2; v++) {
          const tail = v === 1 ? 0.35 : 1
          colors[i * 6 + v * 3] = starColor.r * fade * tail
          colors[i * 6 + v * 3 + 1] = starColor.g * fade * tail
          colors[i * 6 + v * 3 + 2] = starColor.b * fade * tail
        }
      }

      geometry.attributes.position.needsUpdate = true
      geometry.attributes.color.needsUpdate = true
      renderer.render(scene, camera)
    }
    frameId = requestAnimationFrame(animate)

    const resizeHandler = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', resizeHandler)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resizeHandler)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none" aria-hidden="true" />
}
