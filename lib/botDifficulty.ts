export const DIFFICULTIES = ['easy', 'medium', 'hard', 'legend'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export interface BotProfile {
  // average characters typed per second; actual delay between characters is
  // jittered around 1 / charsPerSecond so the pace doesn't feel metronomic
  charsPerSecond: number
  jitter: number
  // probability that any given character is mistyped
  mistakeRate: number
  // of the characters that are mistyped, the fraction shipped as-is (wrong
  // word submitted uncorrected) rather than caught and backspaced before submit
  shipRate: number
}

export const BOT_PROFILES: Record<Difficulty, BotProfile> = {
  easy: { charsPerSecond: 3.8, jitter: 0.45, mistakeRate: 0.1, shipRate: 0.45 },
  medium: { charsPerSecond: 6.3, jitter: 0.3, mistakeRate: 0.045, shipRate: 0.25 },
  hard: { charsPerSecond: 8.8, jitter: 0.18, mistakeRate: 0.015, shipRate: 0.1 },
  legend: { charsPerSecond: 13, jitter: 0.12, mistakeRate: 0.005, shipRate: 0.05 }
}
