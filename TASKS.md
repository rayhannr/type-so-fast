# type-so-fast — Task Backlog

## Phase 1 — Logic Optimization ✓ Done
## Phase 2 — AGS Foundation ✓ Done
## Phase 3 — Leaderboard ✓ Done
## Phase 4 — Statistics ✓ Done
## Phase 5 — Cloud Save ✓ Done
## Phase 6 — Achievements ✓ Done

---

## Phase 7 — Full Redesign + Three.js ✓ Done

**T14 — Dark theme base**
Rewrite `app/globals.css` for dark minimal theme: `#111111` bg, `#646669` muted text, `#e2e8f0` active text, `#e2b714` amber accent. Remove crosshatch background pattern.

**T15 — Tab navigation**
Add `[ type ]  [ leaderboard ]  [ achievements ]` tab nav to `GameApp`. Thin amber underline on active tab. Tab state via `useState`. Leaderboard and achievements accessible without finishing a game.

**T16 — Per-character WordContainer**
Rewrite `WordContainer` for Monkeytype-style display: rolling 3-line window, per-character green/red coloring on current word, blinking amber caret at current position, upcoming words in muted gray. New props: add `typedInput: string`.

**T17 — Hidden input**
Rewrite `Input` as a visually hidden zero-size element. Add `onClick` to `WordContainer` to focus it. All typing feedback comes from the character display.

**T18 — Caret particle trail (Three.js)**
Canvas overlay inside `WordContainer` renders glowing ember particles that follow the caret as it advances. Faster correct typing = brighter trail. Wrong keystroke = brief red pulse burst at caret position.

**T19 — Inline result screen**
Rewrite `Result` for dark minimal style. Merge `Records` into it (delete `Records.tsx`). Layout order after game ends: big WPM → accuracy → keystrokes → correct/wrong words → personal bests → SpeedCurve. No side-by-side columns.

**T20 — WPM burst (Three.js)**
New `WpmBurst` component: one-shot Three.js particle explosion originating from the WPM number when the result screen reveals. Particle color and density scale with score. Triggered once when timer hits 0.

**T21 — Speed-warp star field (Three.js)**
Rewrite `ParticleField` as a star-field warp effect. Star velocity maps directly to live WPM — calm drift at low WPM, near-warp streaks at high WPM. Replaces the current floating-dot implementation.

**T22 — SpeedCurve dark restyle**
Update `SpeedCurve` colors for dark theme: dark gridlines, amber curve and fill, light axis labels.

**T23 — AchievementToast dark restyle**
Update `AchievementToast` for dark theme. Keep existing behavior (4s auto-dismiss).

**T24 — Leaderboard tab**
Rewrite `Leaderboard` as a full-width tab view. Top 3 entries rendered via existing `Podium3D` (fed global entries instead of personal records). Ranks 4–10 as a clean table below. Current user row highlighted. Loads on tab open, refreshes after game ends.

**T25 — Achievements tab**
New `AchievementsTab` component + `lib/achievements-manifest.ts` hardcoded list (`speed-demon`, `perfectionist`, `dedicated-typist`, `century-club`). Cross-reference against fetched unlocked set from `useAgsSession`. Unlocked: amber checkmark + name. Locked: muted padlock. Falls back gracefully when not logged in.

---

## Phase 8 — Gameplay Depth

**T26 — Multiple test durations** ✓ Done
Add a 15s / 30s / 60s / 120s duration selector above the word container. Selected duration sets the initial timer value in the reducer. Persist last-used duration in localStorage. Implemented via `DurationSelector` + `duration`/`GameState.duration` wired through the reducer's `RESTART`/`TICK` cases; WPM math (`correctKeystroke * 12 / duration`) generalized off the old hardcoded 60s assumption. Per-duration AGS leaderboard codes deferred to T30 — `lib/ags/leaderboard.ts` untouched.

**T27 — Word modes** ✓ Done
Add a mode selector: `words` (current random Indonesian), `numbers` (digits and number words), `punctuation` (adds commas, periods, apostrophes to the word pool), `quotes` (fixed real sentences). Each mode has its own word/sentence generator. Persist last-used mode in localStorage. Implemented in `lib/word-generators.ts` (`generateWords`) + `constants/quotes.ts` + `ModeSelector` component.

**T28 — Caps lock warning** ✓ Done
Detect `CapsLock` state via `KeyboardEvent.getModifierState('CapsLock')` on keydown. Show a small inline warning near the input when caps lock is active. Dismiss automatically when caps lock is turned off. Wired via `onKeyDown` on the hidden `Input` in `GameApp.tsx`.

**T29 — Tab to restart** ✓ Done
Add a global `keydown` listener: pressing `Tab` calls `restartHandler` and prevents default browser focus behavior. Show a small `Tab` badge hint near the restart button.

**T30 — Per-duration leaderboards**
Leaderboard tab gets a duration filter (15s / 30s / 60s / 120s) matching T26. Switching duration fetches the corresponding AGS leaderboard. `getTopLeaderboard` in `lib/ags/leaderboard.ts` accepts a leaderboard code parameter.

**T31 — Weekly leaderboard (+ per-mode, see T32)**
Add a time-range selector to the leaderboard tab: `all-time` / `this week`. Requires additional AGS leaderboard configs with a weekly cycle reset. UI shows the active filter as a tab or toggle. Implement alongside T32 — cross the time-range selector with the mode filter so switching either fetches the right AGS leaderboard code (e.g. `wpm-weekly-numbers`).

**T32 — Per-mode leaderboards**
Leaderboard tab gets a mode filter (`words` / `numbers` / `punctuation` / `quotes`, matching T27) alongside the all-time board. Each mode needs its own AGS leaderboard code (e.g. `wpm-alltime-words`, `wpm-alltime-numbers`, `wpm-alltime-punctuation`, `wpm-alltime-quotes`) configured in the AGS Admin Portal. `getTopLeaderboard` in `lib/ags/leaderboard.ts` accepts a leaderboard code parameter instead of the hardcoded `LEADERBOARD_CODE`. `apiSubmitStats`/score submission needs to know the mode played so it posts to the right code. Implement together with T31 (weekly leaderboard) — combine mode × time-range into one code scheme (e.g. `wpm-alltime-numbers`, `wpm-weekly-numbers`) rather than treating them as independent matrices.

---

## Phase 9 — Stats & Progress

**T33 — Historical WPM chart**
Store last 20 game results (wpm + timestamp) in AGS CloudSave (fallback: localStorage). New `HistoryChart` component renders a line graph of WPM over time, shown in a new `stats` tab alongside the existing personal stats.

**T34 — Key heatmap**
Track per-character miss counts during each game in a `missMap: Record<string, number>` in the reducer. After game ends, render a keyboard layout SVG where each key is colored by miss frequency (cool → hot scale). Show in the result screen below the speed curve.

**T35 — Accuracy breakdown**
Track per-word accuracy (correct chars / total chars attempted) during the game. Show a scrollable word-by-word breakdown in the result screen: each word colored green/yellow/red based on accuracy, with miss count on hover.

**T36 — Daily streak**
Track `lastPlayedDate` and `currentStreak` in AGS CloudSave. Increment streak when the user completes a game on a new calendar day; reset to 1 if a day was skipped. Display streak count in the stats tab with a flame icon. New AGS achievement triggers: 7-day and 30-day streaks.

---

## Phase 10 — Social

**T37 — Shareable result card**
After game ends, a "Share" button generates an OG-style result card (canvas-rendered): username, WPM, accuracy, duration, date. `canvas.toBlob` → download as PNG or copy to clipboard. No external service required.

---

## Phase 11 — More Achievements

**T38 — Additional AGS achievement configs**
Create new achievements in AGS Admin Portal:
- `first-game` — manual trigger on first completed game
- `speed-50` — stat `best-wpm` ≥ 50
- `speed-75` — stat `best-wpm` ≥ 75
- `speed-100` — stat `best-wpm` ≥ 100 (replaces/extends existing `speed-demon`)
- `streak-7` — manual trigger when 7-day streak reached
- `streak-30` — manual trigger when 30-day streak reached

**T39 — Achievement unlock logic for new achievements**
Extend `apiProcessAchievements` in `lib/api.ts` and the POST `/api/achievements` route to handle: `first-game` (games played = 1), WPM tier milestones, and streak milestones. Update `achievements-manifest.ts` with all new entries.

---

## Phase 12 — Polish

**T40 — Sound effects**
Add optional audio feedback: subtle mechanical click on correct keystroke, harsh buzz on error, chime on word completion, fanfare on game end. Sounds off by default; toggle stored in localStorage. Use the Web Audio API to generate sounds procedurally (no audio file assets needed).

**T41 — Custom accent color**
Add a small color picker (5–6 preset swatches + custom hex input) in a settings popover. Selected color overrides the amber `#e2b714` accent — applied to caret, active tab underline, correct characters, and chart curve via a CSS custom property (`--accent`). Persist choice in AGS CloudSave (fallback: localStorage).

**T42 — Light / dark theme toggle** ✓ Done
Add a theme toggle (sun/moon icon) in the top bar. Dark theme is default. Light theme uses `#ffffff` bg, `#646669` muted text, `#111111` active text, same amber accent. Implemented via a `data-theme` attribute on `<html>` with two CSS variable sets in `globals.css`. All color tokens (bg, text, surface, border) reference CSS variables so the swap is automatic. Persist choice in localStorage; respect `prefers-color-scheme` on first visit.

---

## Phase 13 — Progression & Character Animation

**T43 — XP and level system**
Award XP after each completed round (formula tied to WPM/accuracy/words typed, e.g. base XP + bonus for accuracy). Track `xp` and `level` in AGS CloudSave (fallback: localStorage). XP-to-next-level requirement escalates per level via a curve (e.g. quadratic or exponential growth) — pick your own formula and constants, not a flat per-level step. Do not treat any specific numbers as fixed targets; the only requirement is that early levels are cheap and later levels cost substantially more. New `LevelBadge`/XP bar component shown in the top bar and on the result screen; brief level-up animation when a level threshold is crossed.

**T44 — Expanded achievement configs**
Create a broader set of AGS achievements beyond simple level gates, using the stat-tied pattern from Phase 6/11 (`incremental: true` + `statCode`, or manual unlock where no stat fits):
- Level milestones — `level-5`, `level-10`, `level-25`
- Speed tiers — `speed-50`, `speed-75`, `speed-100` (supersedes/extends `speed-demon`, see T38)
- Volume milestones — games played (`dedicated-typist`/`century-club` already exist), total words typed, total XP earned
- Accuracy — perfect-game streaks (e.g. 3 or 10 perfect-accuracy games in a row, not just one-off `perfectionist`)
- Consistency — daily/weekly streaks (`streak-7`, `streak-30`, depends on T36's streak tracking)
- Session variety — playing each word mode (T27) at least once, trying every duration (T26)
Add all new entries to `achievements-manifest.ts`.

**T45 — Character background animation (replaces star-field)** ✓ Done
Replace the `ParticleField` space-debris/star-warp visual (T21) with a Three.js animated pair of hands typing on a keyboard as the background (chosen over a running-person figure — no skeletal rig needed, and it's thematically tighter for a typing game). Implemented stronger than originally scoped: instead of WPM-scaled random taps, each real keystroke taps its actual QWERTY key with the nearest finger (space → thumb on spacebar, backspace → top-right key), so the animation mirrors the player's typing exactly and stays still when they aren't typing.

---

## Phase 14 — Data Layer

**T46 — Adopt React Query via the AccelByte SDK's generated hooks**
Each installed `@accelbyte/sdk-*` package already ships `@tanstack/react-query` as an optional peer dep plus pre-built hooks (e.g. `useUserAchievementsApi_GetAchievements_ByUserId`, `useUserAchievementsApi_UpdateUnlock_ByUserId_ByAchievementCodeMutation`, and equivalents in `sdk-leaderboard`/`sdk-social`/`sdk-cloudsave`) — don't hand-roll `useQuery`/`useMutation` wrappers around the current `axios`-based `lib/api.ts` calls. Install `@tanstack/react-query`, wrap the app in a `QueryClientProvider`, and replace the manual `useState`/`useEffect` fetch + `refreshKey` refetch pattern in `GameApp.tsx` with the SDK's generated hooks directly, using their built-in cache invalidation. Note: these calls currently go through our own `/api/*` Next.js routes (which hold the AGS access token server-side) rather than calling AGS directly from the client — check whether the generated hooks are meant to run client-side against AGS directly (would require rethinking the session/token model) or whether they're better suited to server-side usage in the route handlers before committing to an approach. Sets up the fetch layer for T44's achievement fetching-from-AGS-instead-of-manifest follow-up.
