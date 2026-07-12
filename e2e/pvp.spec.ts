import { test, expect } from '@playwright/test'
import { Browser, Page } from '@playwright/test'

// Covers the PvP quick-match flow end to end against the real AGS dev namespace: two
// independent Device ID sessions queue, get matched, complete the WebRTC handshake (signaled
// through session attributes — see docs/ags-plans/2026-07-07-pvp-quick-match.md), and sync
// live typing progress over the data channel. This is the flow that was manually verified with
// a two-browser Playwright script during T50 implementation; codified here so regressions in
// matchmaking/session/signaling surface automatically instead of needing another manual pass.

const waitForRacing = async (page: Page) => {
  await expect.poll(async () => (await page.locator('body').innerText()).includes('WPM'), { timeout: 45_000, intervals: [1000] }).toBe(true)
}

test("two players quick-match and see each other's live progress", async ({ browser }: { browser: Browser }) => {
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const pageA = await ctxA.newPage()
  const pageB = await ctxB.newPage()

  const crashesA: string[] = []
  const crashesB: string[] = []
  pageA.on('pageerror', e => crashesA.push(e.message))
  pageB.on('pageerror', e => crashesB.push(e.message))

  await pageA.goto('/pvp', { waitUntil: 'networkidle' })
  await pageB.goto('/pvp', { waitUntil: 'networkidle' })

  // Device ID login on mount needs a moment to settle before the ticket can be created
  await pageA.waitForTimeout(1500)
  await pageB.waitForTimeout(1500)

  await pageA.getByText('Quick Match').click()
  await pageB.getByText('Quick Match').click()

  await waitForRacing(pageA)
  await waitForRacing(pageB)

  await pageA.keyboard.type('halo dunia ini adalah contoh', { delay: 30 })
  await pageB.keyboard.type('selamat pagi semua orang', { delay: 30 })

  // give the data channel a moment to relay both sides' snapshots
  await pageA.waitForTimeout(1500)

  const textA = await pageA.locator('body').innerText()
  const textB = await pageB.locator('body').innerText()

  expect(crashesA, `A threw: ${crashesA.join('; ')}`).toHaveLength(0)
  expect(crashesB, `B threw: ${crashesB.join('; ')}`).toHaveLength(0)

  // each side should see the OPPONENT's progress synced to a non-zero WPM over the data
  // channel — proves the snapshot broadcast/receive path works, not just each side's own typing
  expect(textA).toMatch(/Opponent — [1-9]\d* WPM/)
  expect(textB).toMatch(/Opponent — [1-9]\d* WPM/)

  await ctxA.close()
  await ctxB.close()
})
