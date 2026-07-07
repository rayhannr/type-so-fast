'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'

export interface Keystroke {
  id: number
  char: string
}

interface Props {
  keystrokeRef: RefObject<Keystroke>
  gameOver: boolean
}

const KEY_COLOR_DARK = new Color('#3a3d42')
const HAND_COLOR_DARK = new Color('#646669')
const KEY_COLOR_LIGHT = new Color('#fafbfc')
const HAND_COLOR_LIGHT = new Color('#eff0f2')
const GLOW_COLOR = new Color('#e2b714')

const isLightTheme = () => document.documentElement.getAttribute('data-theme') === 'light'

// QWERTY layout, top row to bottom row; '\b' additionally maps to the top-right key
const KEY_LAYOUT = ['1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./']
const KEY_COLS = 12
const KEY_STEP = 1.05
const FINGER_REST = -0.25
const FINGER_PRESS = -0.7
const TAP_DURATION = 0.22

interface FingerState {
  group: Group
  x: number
  t: number // 0..1 tap progress, 1 = idle
}

// animated pair of hands typing on a keyboard: each real keystroke taps the
// matching QWERTY key with the nearest finger — no input, no motion
export const TypingHands = ({ keystrokeRef, gameOver }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameOverRef = useRef(gameOver)

  gameOverRef.current = gameOver

  useEffect(() => {
    const container = containerRef.current
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const scene = new Scene()
    const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 50)
    camera.position.set(0, 6.5, 7)
    camera.lookAt(0, 0, 0.3)

    const renderer = new WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.opacity = '0.5'
    container.appendChild(renderer.domElement)

    const ambient = new AmbientLight(0xffffff, isLightTheme() ? 1.6 : 0.7)
    scene.add(ambient)
    const sun = new DirectionalLight(0xffffff, isLightTheme() ? 0.6 : 1)
    sun.position.set(2, 8, 4)
    scene.add(sun)

    // keyboard: staggered grid of keys, each with its own material so a
    // pressed key can glow and sink independently
    const keyGeometry = new BoxGeometry(0.85, 0.25, 0.85)
    const keys: { mesh: Mesh; material: MeshStandardMaterial; heat: number }[] = []
    const charToKey = new Map<string, number>()

    const addKey = (geometry: BoxGeometry, x: number, z: number) => {
      const material = new MeshStandardMaterial({
        color: isLightTheme() ? KEY_COLOR_LIGHT : KEY_COLOR_DARK,
        roughness: 0.85,
      })
      const mesh = new Mesh(geometry, material)
      mesh.position.set(x, 0, z)
      scene.add(mesh)
      return keys.push({ mesh, material, heat: 0 }) - 1
    }

    KEY_LAYOUT.forEach((rowChars, row) => {
      for (let col = 0; col < KEY_COLS; col++) {
        const index = addKey(keyGeometry, (col - (KEY_COLS - 1) / 2) * KEY_STEP + row * 0.3, (row - 1.5) * KEY_STEP)
        if (rowChars[col]) charToKey.set(rowChars[col], index)
      }
    })
    charToKey.set('\b', charToKey.get('=')!)

    const spacebarGeometry = new BoxGeometry(5, 0.25, 0.85)
    const spacebarIndex = addKey(spacebarGeometry, 0.45, 2.5 * KEY_STEP)

    const handMaterial = new MeshStandardMaterial({
      color: isLightTheme() ? HAND_COLOR_LIGHT : HAND_COLOR_DARK,
      roughness: 0.7,
    })
    const palmGeometry = new BoxGeometry(1.7, 0.35, 1.3)
    // finger pivots at its knuckle (back edge) so rotation.x dips the tip
    const fingerGeometry = new BoxGeometry(0.3, 0.26, 1.25)
    fingerGeometry.translate(0, 0, -0.62)
    const thumbGeometry = new BoxGeometry(0.3, 0.24, 0.9)
    thumbGeometry.translate(0, 0, -0.45)

    const fingers: FingerState[] = []
    const thumbs: FingerState[] = []
    const hands: Group[] = []

    for (const side of [-1, 1]) {
      const hand = new Group()
      hand.position.set(side * 2.1, 1.05, 2.9)
      hand.rotation.z = side * -0.06

      const palm = new Mesh(palmGeometry, handMaterial)
      hand.add(palm)

      for (let f = 0; f < 4; f++) {
        const knuckle = new Group()
        const offsetX = (f - 1.5) * 0.42
        knuckle.position.set(offsetX, 0, -0.6)
        knuckle.rotation.x = FINGER_REST
        knuckle.add(new Mesh(fingerGeometry, handMaterial))
        hand.add(knuckle)
        fingers.push({ group: knuckle, x: hand.position.x + offsetX, t: 1 })
      }

      const thumb = new Group()
      thumb.position.set(side * -0.75, -0.05, 0.35)
      thumb.rotation.set(FINGER_REST, side * -0.5, 0)
      thumb.add(new Mesh(thumbGeometry, handMaterial))
      hand.add(thumb)
      thumbs.push({ group: thumb, x: hand.position.x, t: 1 })

      scene.add(hand)
      hands.push(hand)
    }

    const pressKey = (char: string) => {
      let finger: FingerState | undefined
      let keyIndex: number | undefined

      if (char === ' ') {
        keyIndex = spacebarIndex
        finger = thumbs[Math.floor(Math.random() * thumbs.length)]
      } else {
        keyIndex = charToKey.get(char.toLowerCase())
        if (keyIndex === undefined) return
        const keyX = keys[keyIndex].mesh.position.x
        finger = fingers.reduce((nearest, candidate) =>
          Math.abs(candidate.x - keyX) < Math.abs(nearest.x - keyX) ? candidate : nearest
        )
      }

      finger.t = 0
      keys[keyIndex].heat = 1
    }

    let lastStrokeId = keystrokeRef.current.id
    let frameId = 0
    let lastTime = performance.now()

    const animate = (now: number) => {
      frameId = requestAnimationFrame(animate)
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      const elapsed = now / 1000

      const stroke = keystrokeRef.current
      if (stroke.id !== lastStrokeId) {
        lastStrokeId = stroke.id
        if (!gameOverRef.current) pressKey(stroke.char)
      }

      const targetOpacity = gameOverRef.current ? 0.22 : 0.5
      const opacity = parseFloat(renderer.domElement.style.opacity)
      renderer.domElement.style.opacity = String(opacity + (targetOpacity - opacity) * 1.5 * dt)

      for (const finger of fingers.concat(thumbs)) {
        if (finger.t >= 1) continue
        finger.t = Math.min(finger.t + dt / TAP_DURATION, 1)
        // down fast (first 40%), back up slower
        const p = finger.t < 0.4 ? finger.t / 0.4 : 1 - (finger.t - 0.4) / 0.6
        finger.group.rotation.x = FINGER_REST + (FINGER_PRESS - FINGER_REST) * p
      }

      for (const key of keys) {
        if (key.heat <= 0) continue
        key.heat = Math.max(key.heat - 4 * dt, 0)
        key.mesh.position.y = -key.heat * 0.12
        key.material.emissive.copy(GLOW_COLOR).multiplyScalar(key.heat * 0.9)
      }

      // subtle hover so the hands feel alive even when idle
      hands.forEach((hand, i) => {
        hand.position.y = 1.05 + Math.sin(elapsed * 1.4 + i * Math.PI) * 0.035
      })

      renderer.render(scene, camera)
    }
    frameId = requestAnimationFrame(animate)

    const resizeHandler = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', resizeHandler)

    const themeObserver = new MutationObserver(() => {
      const light = isLightTheme()
      handMaterial.color.copy(light ? HAND_COLOR_LIGHT : HAND_COLOR_DARK)
      keys.forEach((key) => key.material.color.copy(light ? KEY_COLOR_LIGHT : KEY_COLOR_DARK))
      ambient.intensity = light ? 1.6 : 0.7
      sun.intensity = light ? 0.6 : 1
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resizeHandler)
      themeObserver.disconnect()
      keyGeometry.dispose()
      spacebarGeometry.dispose()
      palmGeometry.dispose()
      fingerGeometry.dispose()
      thumbGeometry.dispose()
      handMaterial.dispose()
      keys.forEach((key) => key.material.dispose())
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none" aria-hidden="true" />
}
