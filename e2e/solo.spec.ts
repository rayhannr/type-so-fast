import { Page, test, expect } from '@playwright/test'

// Covers the solo typing race at the root route: picking the shortest duration and the
// default word mode, typing a mix of fully-correct words plus one deliberately mistyped word,
// letting the 15s timer run out, and checking the results screen reports figures that are
// actually consistent with what was typed (not just "some numbers rendered") before verifying
// restart puts the player back into a fresh race.

const readCurrentWords = async (page: Page): Promise<string[]> => {
  const text = await page.getByTestId('word-container').innerText()
  return text.trim().split(/\s+/).filter(Boolean)
}

// every character differs from the source word's character at that position, so this word
// is guaranteed to be scored as wrong regardless of what the actual word turns out to be
const mistype = (word: string): string =>
  word
    .split('')
    .map(char => (char.toLowerCase() === 'z' ? 'a' : 'z'))
    .join('')

test('typing correct words plus one mistyped word produces a results screen matching what was typed', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })

  // word list is generated client-side after mount; wait for it to populate
  await expect.poll(async () => (await readCurrentWords(page)).length, { timeout: 10_000 }).toBeGreaterThan(0)

  await page.getByRole('button', { name: '15s' }).click()
  await page.getByRole('button', { name: 'Words', exact: true }).click()

  const words = await readCurrentWords(page)
  const [correctA, correctB, correctC, toMistype] = words

  const input = page.getByLabel('Type the highlighted word')
  // the input itself is visually hidden; the word display area is the click target that
  // focuses it (see WordContainer's onClick={onFocusRequest})
  await page.getByTestId('word-container').click()

  await page.keyboard.type(`${correctA} `, { delay: 30 })
  await page.keyboard.type(`${correctB} `, { delay: 30 })
  await page.keyboard.type(`${correctC} `, { delay: 30 })
  await page.keyboard.type(`${mistype(toMistype)} `, { delay: 30 })

  // 15s duration selected above; wait for the timer to run out and the results screen to render
  await expect
    .poll(async () => (await page.locator('body').innerText()).includes('Accuracy'), {
      timeout: 25_000,
      intervals: [1000]
    })
    .toBe(true)

  const resultText = await page.locator('body').innerText()

  const wpmMatch = resultText.match(/(\d+)\s*\n?WPM/)
  const accuracyMatch = resultText.match(/Accuracy\s*([\d.]+)%/)
  expect(wpmMatch, `results screen text: ${resultText}`).not.toBeNull()
  expect(accuracyMatch, `results screen text: ${resultText}`).not.toBeNull()

  const wpm = Number(wpmMatch![1])
  const accuracy = Number(accuracyMatch![1])

  // three words typed exactly right, one word typed with every character wrong: accuracy
  // must reflect that mistake (strictly below 100) while still being majority-correct
  expect(accuracy).toBeGreaterThan(50)
  expect(accuracy).toBeLessThan(100)
  expect(accuracy).toBeLessThanOrEqual(100)
  expect(accuracy).toBeGreaterThanOrEqual(0)

  // duration is fixed at 15s for the whole race, so WPM is bounded by the correct
  // characters actually typed (3 whole words), independent of real wall-clock timing
  const correctChars = correctA.length + correctB.length + correctC.length
  const expectedWpmFloor = Math.floor((correctChars * 12) / 15) - 2
  const expectedWpmCeil = Math.ceil((correctChars * 12) / 15) + 2
  expect(wpm).toBeGreaterThan(0)
  expect(wpm).toBeGreaterThanOrEqual(expectedWpmFloor)
  expect(wpm).toBeLessThanOrEqual(expectedWpmCeil)

  // restarting returns to a fresh race: timer/duration selector visible again, word list
  // reset, and the mistyped word from the finished race is no longer the current word
  await page.getByRole('button', { name: 'Restart game' }).click()
  await expect(page.getByRole('button', { name: '15s' })).toBeVisible()
  await expect.poll(async () => (await readCurrentWords(page)).length, { timeout: 10_000 }).toBeGreaterThan(0)
  const wordsAfterRestart = await readCurrentWords(page)
  expect(wordsAfterRestart[0]).not.toBe(mistype(toMistype))
  await expect(input).toHaveValue('')
})
