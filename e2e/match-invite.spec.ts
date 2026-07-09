import { test, expect } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'

// Covers the friends + match-invite flow end to end against the real AGS dev namespace: two
// independent Device ID sessions become friends via friend code, one invites the other to a
// match over the live Pusher channel (see hooks/usePendingInvite.ts), the invitee accepts and
// both players land in the same PvP session via the `/pvp?session=<id>` join path added in
// components/PvpGame.tsx. A second pass covers the decline path.

const becomeFriends = async (pageA: Page, pageB: Page) => {
  await pageA.goto('/friends', { waitUntil: 'networkidle' })
  await pageB.goto('/friends', { waitUntil: 'networkidle' })

  const codeSpanA = pageA.getByTestId('friend-code')
  await expect.poll(async () => (await codeSpanA.innerText()).length).toBeGreaterThan(0)
  const codeA = (await codeSpanA.innerText()).trim()

  await pageB.getByLabel("Friend's code").fill(codeA)
  await pageB.getByRole('button', { name: 'Add friend' }).click()
  await expect(pageB.getByText(/friend request sent/i)).toBeVisible()

  await expect.poll(async () => (await pageA.locator('body').innerText()).includes('wants to be friends'), { timeout: 15_000 }).toBe(true)
  await pageA.getByRole('button', { name: 'Accept' }).click()

  await expect.poll(async () => (await pageA.locator('body').innerText()).includes('Online'), { timeout: 15_000 }).toBe(true)
}

test.describe('match invites between friends', () => {
  test('accepting an invite drops both players into the same PvP session', async ({ browser }: { browser: Browser }) => {
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    await pageA.goto('/pvp', { waitUntil: 'networkidle' })
    await pageB.goto('/pvp', { waitUntil: 'networkidle' })
    // Device ID login on mount needs a moment to settle
    await pageA.waitForTimeout(1500)
    await pageB.waitForTimeout(1500)

    await becomeFriends(pageA, pageB)

    await pageA.getByRole('button', { name: /^Invite$/ }).click()
    await expect(pageA.getByRole('button', { name: /Invited/ })).toBeVisible()

    await expect(pageB.getByText("You've been invited to a match!")).toBeVisible({ timeout: 15_000 })
    await pageB.getByRole('button', { name: 'Accept' }).click()

    await expect(pageB).toHaveURL(/\/pvp\?session=/, { timeout: 15_000 })
    const sessionId = new URL(pageB.url()).searchParams.get('session')
    expect(sessionId).toBeTruthy()

    // the inviter is redirected to the same session once AGS reports the invitee's accept
    await expect(pageA).toHaveURL(new RegExp(`/pvp\\?session=${sessionId}`), { timeout: 15_000 })

    await ctxA.close()
    await ctxB.close()
  })

  test('declining an invite notifies the inviter and clears the invitee banner', async ({ browser }: { browser: Browser }) => {
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    await pageA.goto('/pvp', { waitUntil: 'networkidle' })
    await pageB.goto('/pvp', { waitUntil: 'networkidle' })
    await pageA.waitForTimeout(1500)
    await pageB.waitForTimeout(1500)

    await becomeFriends(pageA, pageB)

    await pageA.getByRole('button', { name: /^Invite$/ }).click()
    await expect(pageB.getByText("You've been invited to a match!")).toBeVisible({ timeout: 15_000 })

    await pageB.getByRole('button', { name: 'Decline' }).click()
    await expect(pageB.getByText("You've been invited to a match!")).toHaveCount(0)

    await expect(pageA.getByText('Your match invite was declined.')).toBeVisible({ timeout: 15_000 })
    // banner auto-dismisses after 4s
    await expect(pageA.getByText('Your match invite was declined.')).toHaveCount(0, { timeout: 8_000 })

    await ctxA.close()
    await ctxB.close()
  })
})
