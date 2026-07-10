import { test, expect } from '@playwright/test'
import { Browser, Page } from '@playwright/test'

// Covers the room-code match flow end to end against the real AGS dev namespace: a host
// creates a room (AGS-native generate-code, see lib/ags/session.ts's createRoomSession),
// up to 4 more players join by submitting the code, the host starts the race (which revokes
// the code and closes joinability — see lockRoom), and live progress syncs over Pusher instead
// of WebRTC (see hooks/useRoomChannel.ts, docs/ags-plans/2026-07-08-room-code-match.md). Uses
// 3 players (host + 2 joiners) as a representative multi-join case rather than the full 5-seat
// capacity, to keep the run fast — the join/roster/lock mechanics don't change with player count.

// unlike PvP's opponent panel ("Opponent — X WPM"), RoomGame's racing view has no uppercase
// "WPM" text anywhere — the typing input (only rendered once racing starts) is the reliable signal
const waitForRacing = async (page: Page) => {
  await expect(page.getByLabel('Type the highlighted word')).toBeVisible({ timeout: 45_000 })
}

test('host creates a room, two players join by code, race runs, and late joins are rejected', async ({
  browser,
}: {
  browser: Browser
}) => {
  // heavier than a typical 2-context spec: 3 simultaneous contexts against live AGS/Pusher plus a
  // cold first-hit dev compile of the /room route — parallelize independent waits below (not
  // sequential like the 2-context PvP/Friends specs) to keep total wall-clock reasonable
  test.setTimeout(120_000)
  const ctxHost = await browser.newContext()
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const pageHost = await ctxHost.newPage()
  const pageA = await ctxA.newPage()
  const pageB = await ctxB.newPage()

  const crashes: string[] = []
  for (const page of [pageHost, pageA, pageB]) page.on('pageerror', (e) => crashes.push(e.message))

  await Promise.all([pageHost, pageA, pageB].map((page) => page.goto('/room', { waitUntil: 'networkidle' })))
  // Device ID login on mount needs a moment to settle
  await Promise.all([pageHost, pageA, pageB].map((page) => page.waitForTimeout(1500)))

  await pageHost.getByRole('button', { name: 'Create Room' }).click()
  await expect(pageHost.getByText('Room code')).toBeVisible({ timeout: 15_000 })

  // the code paragraph shows a 6-dot placeholder ("······") until the real code loads — both are
  // 6 characters, so wait for actual alphanumerics, not just a length match
  const codeParagraph = pageHost.locator('p.text-accent')
  await expect
    .poll(async () => /^[0-9A-Z]{6}$/.test((await codeParagraph.innerText()).trim()), { timeout: 15_000 })
    .toBe(true)
  const code = (await codeParagraph.innerText()).trim()

  // the host sees the Start button immediately, before anyone else has joined
  await expect(pageHost.getByRole('button', { name: /Start Match/ })).toBeVisible()

  await Promise.all(
    [pageA, pageB].map(async (page) => {
      await page.getByLabel('Room code').fill(code)
      await page.getByRole('button', { name: /^Join$/ }).click()
      await expect(page.getByText('Waiting for the host to start')).toBeVisible({ timeout: 15_000 })
    })
  )

  // roster should reflect all 3 players on the host's screen before starting
  await expect.poll(async () => (await pageHost.locator('body').innerText()).includes('3 / 5 players joined'), {
    timeout: 15_000,
  }).toBe(true)

  await pageHost.getByRole('button', { name: /Start Match/ }).click()

  await Promise.all([pageHost, pageA, pageB].map(waitForRacing))

  // the code is revoked on start — a fresh client submitting the same code should be rejected,
  // not silently succeed
  const ctxLate = await browser.newContext()
  const pageLate = await ctxLate.newPage()
  await pageLate.goto('/room', { waitUntil: 'networkidle' })
  await pageLate.waitForTimeout(1500)
  await pageLate.getByLabel('Room code').fill(code)
  await pageLate.getByRole('button', { name: /^Join$/ }).click()
  await expect(pageLate.getByText(/Invalid or expired code/)).toBeVisible({ timeout: 15_000 })
  await ctxLate.close()

  await pageHost.keyboard.type('halo dunia ini adalah contoh', { delay: 30 })
  await pageA.keyboard.type('selamat pagi semua orang', { delay: 30 })

  // don't assume the round is still racing by the time we read this — a slow run (rate limits,
  // cold compiles, the late-join subtest above) could let the round's own timer finish first.
  // Accept either: still racing with an opponent's synced progress ("N wpm"), or the round just
  // ended and the win/lose outcome banner rendered ("... WPM · Best opponent: ... WPM") — both
  // prove the same thing, that opponent progress made it across the Pusher channel.
  await expect
    .poll(async () => (await pageHost.locator('body').innerText()).match(/\d+ wpm|Best opponent: \d+ WPM/i) !== null, {
      timeout: 15_000,
    })
    .toBe(true)

  expect(crashes, `crashed: ${crashes.join('; ')}`).toHaveLength(0)

  await ctxHost.close()
  await ctxA.close()
  await ctxB.close()
})

test('joining with an invalid room code shows a clean error', async ({ browser }: { browser: Browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto('/room', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  await page.getByLabel('Room code').fill('ZZZZZZ')
  await page.getByRole('button', { name: /^Join$/ }).click()
  await expect(page.getByText(/Invalid or expired code/)).toBeVisible({ timeout: 15_000 })

  await ctx.close()
})
