// procedural sound effects via the Web Audio API — no audio file assets.
// module-level flag so the hot path (every keystroke) is a cheap boolean check.
let audioCtx: AudioContext | null = null
let soundOn = false

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  if (!audioCtx) audioCtx = new AudioContext()
  // browsers suspend fresh contexts until a user gesture; keystrokes count as one
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

export const loadSoundPreference = (): boolean => {
  soundOn = localStorage.getItem('soundEnabled') === 'true'
  return soundOn
}

export const setSoundEnabled = (on: boolean): void => {
  soundOn = on
  try {
    localStorage.setItem('soundEnabled', String(on))
  } catch {
    // localStorage unavailable; preference still applies for this visit
  }
}

interface ToneOptions {
  type?: OscillatorType
  gain?: number
  delay?: number
}

const tone = (frequency: number, duration: number, { type = 'sine', gain = 0.1, delay = 0 }: ToneOptions = {}) => {
  const ctx = getCtx()
  if (!ctx) return
  const start = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)
  amp.gain.setValueAtTime(gain, start)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration)
}

// subtle mechanical click on a correct keystroke
export const playKeyClick = (): void => {
  if (!soundOn) return
  tone(1800, 0.045, { type: 'triangle', gain: 0.07 })
}

// harsh low buzz on a wrong keystroke
export const playErrorBuzz = (): void => {
  if (!soundOn) return
  tone(140, 0.15, { type: 'sawtooth', gain: 0.09 })
}

// two-note rising chime when a word is completed correctly
export const playWordChime = (): void => {
  if (!soundOn) return
  tone(880, 0.1, { gain: 0.06 })
  tone(1320, 0.14, { gain: 0.06, delay: 0.06 })
}

// short ascending arpeggio when the timer hits zero
export const playFanfare = (): void => {
  if (!soundOn) return
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((frequency, index) => tone(frequency, 0.35, { gain: 0.08, delay: index * 0.09 }))
}
