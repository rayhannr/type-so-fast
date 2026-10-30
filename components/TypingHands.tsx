'use client'

import { useEffect, useRef, RefObject } from 'react'
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
  WebGLRenderer
} from 'three'
import { Keystroke } from '@/lib/gameReducer'

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
const FINGER_LENGTH = 1.25
const TAP_DURATION = 0.22
const HAND_HOME = { x: 2.1, y: 1.05, z: 2.9 }
// hand-local depth of a fingertip at the bottom of a tap (knuckle offset + rotated finger)
const TIP_REACH_Z = 0.6 + FINGER_LENGTH * Math.cos(FINGER_PRESS)
// touch-typing finger per keyboard column, as an index into `fingers`:
// left pinky, ring, middle, index x2, then right index x2, middle, ring, pinky x3
const COLUMN_FINGER = [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7]
const HAND_FOLLOW = 25 // exponential approach rate, per second
const HAND_IDLE_RETURN = 0.5 // seconds without a keystroke before a hand drifts home

interface FingerState {
  group: Group
  hand: number
  offsetX: number // knuckle x relative to its hand
  t: number // 0..1 tap progress, 1 = idle
}

interface HandState {
  group: Group
  homeX: number
  targetX: number
  targetZ: number
  idle: number
}

// animated pair of hands typing on a keyboard: each real keystroke taps the
// matching QWERTY key with its touch-typing finger, sliding the hand so the
// fingertip lands on that key, no input, no motion
export const TypingHands = ({ keystrokeRef, gameOver }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameOverRef = useRef(gameOver)

  gameOverRef.current = gameOver

  useEffect(() => {
    const container = containerRef.current
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const scene = new Scene()
    const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 50)

    // the keyboard has a fixed world width, so on narrow (portrait-ish) viewports
    // the horizontal FOV isn't wide enough to fit it, dolly the camera back along
    // its view direction as the aspect drops below BASE_ASPECT so it keeps fitting
    const BASE_ASPECT = 16 / 9
    const CAMERA_TARGET = { x: 0, y: 0, z: 0.3 }
    const CAMERA_OFFSET = { x: 0, y: 6.5, z: 6.7 }
    const positionCamera = () => {
      const aspect = window.innerWidth / window.innerHeight
      const dolly = aspect < BASE_ASPECT ? BASE_ASPECT / aspect : 1
      camera.position.set(
        CAMERA_TARGET.x + CAMERA_OFFSET.x * dolly,
        CAMERA_TARGET.y + CAMERA_OFFSET.y * dolly,
        CAMERA_TARGET.z + CAMERA_OFFSET.z * dolly
      )
      camera.lookAt(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z)
    }
    positionCamera()

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
    const charToKey = new Map<string, { index: number; col: number }>()

    const addKey = (geometry: BoxGeometry, x: number, z: number) => {
      const material = new MeshStandardMaterial({
        color: isLightTheme() ? KEY_COLOR_LIGHT : KEY_COLOR_DARK,
        roughness: 0.85
      })
      const mesh = new Mesh(geometry, material)
      mesh.position.set(x, 0, z)
      scene.add(mesh)
      return keys.push({ mesh, material, heat: 0 }) - 1
    }

    KEY_LAYOUT.forEach((rowChars, row) => {
      for (let col = 0; col < KEY_COLS; col++) {
        const index = addKey(keyGeometry, (col - (KEY_COLS - 1) / 2) * KEY_STEP + row * 0.3, (row - 1.5) * KEY_STEP)
        if (rowChars[col]) charToKey.set(rowChars[col], { index, col })
      }
    })
    charToKey.set('\b', charToKey.get('=')!)

    const spacebarGeometry = new BoxGeometry(5, 0.25, 0.85)
    const spacebarIndex = addKey(spacebarGeometry, 0.45, 2.5 * KEY_STEP)

    const handMaterial = new MeshStandardMaterial({
      color: isLightTheme() ? HAND_COLOR_LIGHT : HAND_COLOR_DARK,
      roughness: 0.7
    })
    const palmGeometry = new BoxGeometry(1.7, 0.35, 1.3)
    // finger pivots at its knuckle (back edge) so rotation.x dips the tip
    const fingerGeometry = new BoxGeometry(0.3, 0.26, 1.25)
    fingerGeometry.translate(0, 0, -0.62)
    const thumbGeometry = new BoxGeometry(0.3, 0.24, 0.9)
    thumbGeometry.translate(0, 0, -0.45)

    const fingers: FingerState[] = []
    const thumbs: FingerState[] = []
    const hands: HandState[] = []

    for (const side of [-1, 1]) {
      const handIndex = hands.length
      const hand = new Group()
      hand.position.set(side * HAND_HOME.x, HAND_HOME.y, HAND_HOME.z)
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
        fingers.push({ group: knuckle, hand: handIndex, offsetX, t: 1 })
      }

      const thumb = new Group()
      thumb.position.set(side * -0.75, -0.05, 0.35)
      thumb.rotation.set(FINGER_REST, side * -0.5, 0)
      thumb.add(new Mesh(thumbGeometry, handMaterial))
      hand.add(thumb)
      thumbs.push({ group: thumb, hand: handIndex, offsetX: 0, t: 1 })

      scene.add(hand)
      hands.push({ group: hand, homeX: hand.position.x, targetX: hand.position.x, targetZ: HAND_HOME.z, idle: 0 })
    }

    const pressKey = (char: string) => {
      let finger: FingerState | undefined
      let keyIndex: number | undefined

      if (char === ' ') {
        keyIndex = spacebarIndex
        finger = thumbs[Math.floor(Math.random() * thumbs.length)]
      } else {
        const key = charToKey.get(char.toLowerCase())
        if (!key) return
        keyIndex = key.index
        finger = fingers[COLUMN_FINGER[key.col]]
        // move the hand so this finger's tip sits over the key at the bottom of the tap
        const hand = hands[finger.hand]
        const { x, z } = keys[keyIndex].mesh.position
        hand.targetX = x - finger.offsetX
        hand.targetZ = z + TIP_REACH_Z
        hand.idle = 0
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

      const follow = 1 - Math.exp(-HAND_FOLLOW * dt)
      hands.forEach((hand, i) => {
        hand.idle += dt
        if (hand.idle > HAND_IDLE_RETURN) {
          hand.targetX = hand.homeX
          hand.targetZ = HAND_HOME.z
        }
        hand.group.position.x += (hand.targetX - hand.group.position.x) * follow
        hand.group.position.z += (hand.targetZ - hand.group.position.z) * follow
        // subtle hover so the hands feel alive even when idle
        hand.group.position.y = HAND_HOME.y + Math.sin(elapsed * 1.4 + i * Math.PI) * 0.035
      })

      renderer.render(scene, camera)
    }
    frameId = requestAnimationFrame(animate)

    const resizeHandler = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      positionCamera()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', resizeHandler)

    const themeObserver = new MutationObserver(() => {
      const light = isLightTheme()
      handMaterial.color.copy(light ? HAND_COLOR_LIGHT : HAND_COLOR_DARK)
      keys.forEach(key => key.material.color.copy(light ? KEY_COLOR_LIGHT : KEY_COLOR_DARK))
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
      keys.forEach(key => key.material.dispose())
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true" />
}
