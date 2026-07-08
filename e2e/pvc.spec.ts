import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Covers the player-vs-bot mode at /pvc: a human typing fast and accurately against the most
// forgiving ("easy") bot profile should win, and a human who barely types at all against the
// fastest ("legend") bot profile should lose. Both are real outcomes the UI renders explicitly
// (OUTCOME_LABEL in PvcGame.tsx), not just "the game ended" — see lib/botDifficulty.ts for the
// charsPerSecond gap (easy 3.8 vs legend 13) this relies on.

const readCurrentWords = async (page: Page): Promise<string[]> => {
  const text = await page.getByTestId('word-container').innerText()
  return text.trim().split(/\s+/).filter(Boolean)
}

const waitForGameOver = async (page: Page) => {
  await expect
    .poll(async () => (await page.locator('body').innerText()).includes('You: '), { timeout: 25_000, intervals: [1000] })
    .toBe(true)
}

test('typing fast and accurately beats the easy bot', async ({ page }) => {
  await page.goto('/pvc', { waitUntil: 'networkidle' })

  await expect.poll(async () => (await readCurrentWords(page)).length, { timeout: 10_000 }).toBeGreaterThan(0)

  await page.getByRole('button', { name: '15s' }).click()
  await page.getByRole('button', { name: 'Easy' }).click()

  const words = await readCurrentWords(page)
  const typedStream = words.map((word) => `${word} `).join('')

  // the input itself is visually hidden; the word display area is the click target that
  // focuses it (see WordContainer's onClick={onFocusRequest})
  await page.getByTestId('word-container').click()
  // fast, fully correct typing: comfortably outpaces the easy bot's 3.8 chars/sec average
  await page.keyboard.type(typedStream, { delay: 12 })

  await waitForGameOver(page)

  const resultText = await page.locator('body').innerText()
  expect(resultText, resultText).toContain('You Win!')
  expect(resultText).not.toContain('Bot Wins')
})

test('barely typing loses to the legend bot', async ({ page }) => {
  await page.goto('/pvc', { waitUntil: 'networkidle' })

  await expect.poll(async () => (await readCurrentWords(page)).length, { timeout: 10_000 }).toBeGreaterThan(0)

  await page.getByRole('button', { name: '15s' }).click()
  await page.getByRole('button', { name: 'Legend' }).click()

  // the input itself is visually hidden; the word display area is the click target that
  // focuses it (see WordContainer's onClick={onFocusRequest})
  await page.getByTestId('word-container').click()
  // a single keystroke is enough to start the timer (and the bot); the player then goes
  // idle for the rest of the race, so the legend bot's 13 chars/sec pace should run away with it
  await page.keyboard.type('a', { delay: 10 })

  await waitForGameOver(page)

  const resultText = await page.locator('body').innerText()
  expect(resultText, resultText).toContain('Bot Wins')
  expect(resultText).not.toContain('You Win!')
})
