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
Add a 15s / 30s / 60s / 120s duration selector above the word container. Selected duration sets the initial timer value in the reducer. Implemented via `DurationSelector` + `duration`/`GameState.duration` wired through the reducer's `RESTART`/`TICK` cases; WPM math (`correctKeystroke * 12 / duration`) generalized off the old hardcoded 60s assumption. Per-duration AGS leaderboard codes deferred to T30 — `lib/ags/leaderboard.ts` untouched. localStorage persistence of the last-used duration was later removed: the test always opens at the 60s default.

**T27 — Word modes** ✓ Done
Add a mode selector: `words` (current random Indonesian), `numbers` (digits and number words), `punctuation` (adds commas, periods, apostrophes to the word pool), `quotes` (fixed real sentences). Each mode has its own word/sentence generator. Implemented in `lib/word-generators.ts` (`generateWords`) + `constants/quotes.ts` + `ModeSelector` component. localStorage persistence of the last-used mode was later removed: the test always opens in `words`.

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

**T33 — Historical WPM chart** ✓ Done
Store last 20 game results (wpm + timestamp) in AGS CloudSave (fallback: localStorage). New `HistoryChart` component renders a line graph of WPM over time, shown in a new `stats` tab alongside the existing personal stats. Implemented via `lib/progress.ts` (`GameHistoryEntry`, `HISTORY_LIMIT`), CloudSave key `gameHistory` + `/api/history` route, and `StatsTab`/`HistoryChart` components.

**T34 — Key heatmap** ✓ Done
Track per-character miss counts during each game in a `missMap: Record<string, number>` in the reducer. After game ends, render a keyboard layout SVG where each key is colored by miss frequency (cool → hot scale). Show in the result screen below the speed curve. Misses are attributed to the *expected* character (space when typing past a word's end) so the heatmap shows which keys the player should have hit; implemented in `KeyHeatmap.tsx`.

**T35 — Accuracy breakdown** ✓ Done
Track per-word accuracy (correct chars / total chars attempted) during the game. Show a scrollable word-by-word breakdown in the result screen: each word colored green/yellow/red based on accuracy, with miss count on hover. Per-word stats are computed on word submit in the reducer's `INPUT_CHANGE` case (final typed word vs target, positional comparison); implemented in `AccuracyBreakdown.tsx`.

**T36 — Daily streak** ✓ Done
Track `lastPlayedDate` and `currentStreak` in AGS CloudSave. Increment streak when the user completes a game on a new calendar day; reset to 1 if a day was skipped. Display streak count in the stats tab with a flame icon. New AGS achievement triggers: 7/30/100/250/365/500/750/1000-day streaks. Implemented via `advanceStreak` in `lib/progress.ts` (local calendar dates), CloudSave key `dailyStreak` + `/api/streak` route (localStorage fallback), and `unlockStreakAchievementsIfEligible` in `lib/ags/achievements.ts`; manifest entries added. All eight `streak-*` achievement configs (manual-unlock, no `statCode`, matching the `perfectionist` pattern) created directly in the AGS Admin Portal via the `ags` CLI (`ags achievement achievements create`) — no longer pending on T38.

---

## Phase 10 — Social

**T37 — Shareable result card** ✓ Done
After game ends, a "Share" button generates an OG-style result card (canvas-rendered): username, WPM, accuracy, duration, date. `canvas.toBlob` → download as PNG or copy to clipboard. No external service required. Implemented in `ShareCard.tsx` (1200×630 dark card, respects the custom `--accent` from T41); rendered below the result stats with Download PNG / Copy image buttons.

---

## Phase 11 — More Achievements

**T38 — Additional AGS achievement configs** ✓ Done
Create new achievements in AGS Admin Portal:
- `first-game` — already existed (stat-tied to `games-played` ≥ 1, not manual)
- `speed-50` — created via `ags` CLI: "Half Century", stat `best-wpm` ≥ 50, incremental
- `speed-75` — created via `ags` CLI: "Fast Fingers", stat `best-wpm` ≥ 75, incremental
- `speed-100` — not created; existing `speed-demon` already is `best-wpm` ≥ 100, so a separate config would duplicate it
- ~~`streak-7`/`streak-30`~~ — done, see T36 (all eight `streak-*` milestone configs created)

**T39 — Achievement unlock logic for new achievements** ✓ Done
All new achievements are stat-tied, so AGS unlocks them server-side when stats land — no client unlock calls needed. Added `speed-50`/`speed-75` to `achievements-manifest.ts`, and fixed a race in `GameApp.tsx`: `apiProcessAchievements` now runs after `apiSubmitStats` settles (previously parallel), so stat-tied unlocks are diffed and toasted in the same game they happen. Streak milestones were already handled manually in the POST `/api/achievements` route (T36).

---

## Phase 12 — Polish

**T40 — Sound effects** ✓ Done
Add optional audio feedback: subtle mechanical click on correct keystroke, harsh buzz on error, chime on word completion, fanfare on game end. Sounds off by default; toggle stored in localStorage. Use the Web Audio API to generate sounds procedurally (no audio file assets needed). Implemented in `lib/sounds.ts` (lazy AudioContext, module-level enabled flag) + `SoundToggle.tsx` speaker button in the top bar; wired into `GameApp.tsx` keystroke/word/game-end paths.

**T41 — Custom accent color** ✓ Done
Add a small color picker (5–6 preset swatches + custom hex input) in a settings popover. Selected color overrides the amber `#e2b714` accent — applied to caret, active tab underline, correct characters, and chart curve via a CSS custom property (`--accent`). Persist choice in AGS CloudSave (fallback: localStorage). Implemented in `AccentPicker.tsx` (6 swatches + hex input, inline `--accent` override on `<html>`), CloudSave key `settings` + `/api/settings` route (`UserSettings` in `lib/ags/cloudsave.ts`). Note: CloudSave records need no admin config — they're created on the app's first write, same as `bestRecords`/`gameHistory`/`dailyStreak` (the `ags` CLI 0.3.0 can't seed record bodies; spec gap).

**T42 — Light / dark theme toggle** ✓ Done
Add a theme toggle (sun/moon icon) in the top bar. Dark theme is default. Light theme uses `#ffffff` bg, `#646669` muted text, `#111111` active text, same amber accent. Implemented via a `data-theme` attribute on `<html>` with two CSS variable sets in `globals.css`. All color tokens (bg, text, surface, border) reference CSS variables so the swap is automatic. Persist choice in localStorage; respect `prefers-color-scheme` on first visit.

---

## Phase 13 — Progression & Character Animation

**T43 — XP and level system** ✓ Done
Award XP after each completed round (formula tied to WPM/accuracy/words typed, e.g. base XP + bonus for accuracy). Track `xp` and `level` in AGS CloudSave (fallback: localStorage). XP-to-next-level requirement escalates per level via a curve (e.g. quadratic or exponential growth) — pick your own formula and constants, not a flat per-level step. Do not treat any specific numbers as fixed targets; the only requirement is that early levels are cheap and later levels cost substantially more. New `LevelBadge`/XP bar component shown in the top bar and on the result screen; brief level-up animation when a level threshold is crossed. Implemented in `lib/progress.ts` (`xpForGame`, quadratic `levelFromXp`/`levelProgress`, `advanceProgression`), CloudSave key `progression` + `/api/progression` route (localStorage fallback), and `LevelBadge.tsx`; the result screen shows the XP gained and a `.level-up` pop animation (`globals.css`) when a level threshold is crossed. New `total-xp`/`level` AGS stats submitted alongside the existing WPM stats so level also backs achievement unlocks and leaderboards (see the XP leaderboard added after T44 below).

**T44 — Expanded achievement configs** ✓ Done
Create a broader set of AGS achievements beyond simple level gates, using the stat-tied pattern from Phase 6/11 (`incremental: true` + `statCode`, or manual unlock where no stat fits):
- Level milestones — `level-5`, `level-10`, `level-25`
- Speed tiers — `speed-50`, `speed-75`, `speed-100` (supersedes/extends `speed-demon`, see T38)
- Volume milestones — games played (`dedicated-typist`/`century-club` already exist), total words typed, total XP earned
- Accuracy — perfect-game streaks (e.g. 3 or 10 perfect-accuracy games in a row, not just one-off `perfectionist`)
- Consistency — daily/weekly streaks (`streak-7`, `streak-30`, depends on T36's streak tracking)
- Session variety — playing each word mode (T27) at least once, trying every duration (T26)
Add all new entries to `achievements-manifest.ts`.
Implemented via 11 new stat-tied/manual achievement configs created in the AGS Admin Portal through the `ags` CLI: `level-5`/`level-10`/`level-25` (tied to the new `level` stat), `words-1000`/`words-10000` (tied to `total-words-typed`), `xp-5000`/`xp-50000` (tied to the new `total-xp` stat), and manual-unlock `perfect-3`/`perfect-10`/`mode-explorer`/`time-traveler` — `speed-100` was skipped since `speed-demon` already covers that gate (per T38). Client-side eligibility for the manual ones lives in `unlockPerfectStreakIfEligible`/`unlockVarietyIfEligible` (`lib/ags/achievements.ts`), called from the POST `/api/achievements` route alongside the existing perfectionist/streak checks; `century-club` was retied from `total-words-typed` to `games-played` (its originally intended stat) while here. All entries added to `achievements-manifest.ts`.

**XP leaderboard (follow-up, not originally scoped in T43/T44)** ✓ Done
Added a `xp-alltime` AGS leaderboard config tied to the `total-xp` stat, plus a WPM/XP metric toggle in the Leaderboard tab (`lib/ags/leaderboard.ts`, `/api/leaderboard`, `Leaderboard.tsx`) — switching to XP hides the duration/mode/range filters since only one all-time XP board exists.

**T45 — Character background animation (replaces star-field)** ✓ Done
Replace the `ParticleField` space-debris/star-warp visual (T21) with a Three.js animated pair of hands typing on a keyboard as the background (chosen over a running-person figure — no skeletal rig needed, and it's thematically tighter for a typing game). Implemented stronger than originally scoped: instead of WPM-scaled random taps, each real keystroke taps its actual QWERTY key with the nearest finger (space → thumb on spacebar, backspace → top-right key), so the animation mirrors the player's typing exactly and stays still when they aren't typing.

---

## Phase 14 — Data Layer

**T46 — Adopt React Query via the AccelByte SDK's generated hooks** ✓ Done (superseded — see below)
Each installed `@accelbyte/sdk-*` package already ships `@tanstack/react-query` as an optional peer dep plus pre-built hooks (e.g. `useUserAchievementsApi_GetAchievements_ByUserId`, `useUserAchievementsApi_UpdateUnlock_ByUserId_ByAchievementCodeMutation`, and equivalents in `sdk-leaderboard`/`sdk-social`/`sdk-cloudsave`) — don't hand-roll `useQuery`/`useMutation` wrappers around the current `axios`-based `lib/api.ts` calls. Install `@tanstack/react-query`, wrap the app in a `QueryClientProvider`, and replace the manual `useState`/`useEffect` fetch + `refreshKey` refetch pattern in `GameApp.tsx` with the SDK's generated hooks directly, using their built-in cache invalidation. Note: these calls currently go through our own `/api/*` Next.js routes (which hold the AGS access token server-side) rather than calling AGS directly from the client — check whether the generated hooks are meant to run client-side against AGS directly (would require rethinking the session/token model) or whether they're better suited to server-side usage in the route handlers before committing to an approach. Sets up the fetch layer for T44's achievement fetching-from-AGS-instead-of-manifest follow-up.

This task was written before the project settled on proxying all AGS calls through `/api/*` Next.js routes that hold the access token server-side (`lib/ags/*.ts`). The SDK's generated hooks call AGS directly from the browser — confirmed non-viable both because it bypasses that server-side proxy and because a live CORS check against the AGS gateway returned no `Access-Control-Allow-Origin` header, so the browser would block the responses anyway. Implemented instead as `@tanstack/react-query` around the existing `lib/api.ts` fetchers: `app/providers.tsx` (`QueryClientProvider`, wired into `app/layout.tsx`) + `lib/queries.ts` (`useRecordsQuery`/`useStatsQuery`/`useHistoryQuery`/`useStreakQuery`/`useProgressionQuery`, `useLeaderboardQuery`, and matching mutations). Mutations invalidate their own query key on success — e.g. `useSubmitStatsMutation` invalidates `stats` for the signed-in user and every cached `leaderboard` variant — which replaced the manual `leaderboardRefreshKey` prop threaded from `GameApp.tsx` into `Leaderboard.tsx`. `GameApp.tsx` also gets optimistic `queryClient.setQueryData` writes on game-end so the result screen updates immediately rather than waiting on the invalidation round trip. Verified end-to-end by driving the built app in headless Chrome over the DevTools Protocol (no session/mutation/network step was assumed): confirmed the five per-resource queries fire once a session exists, switching the leaderboard's WPM/XP toggle issues a distinct `metric`-scoped request, and a full paced game round produces the expected `PUT` mutations followed by automatic `GET` refetches and a `POST /api/achievements` once stats settle — with the result screen rendering the WPM and XP gain and no console exceptions.

---

## Phase 15 — Testing Infrastructure

**T47 — Vitest unit tests**
Set up Vitest for unit testing pure logic (reducer, `lib/word-generators.ts`, `lib/progress.ts` XP/level/streak math, WPM/accuracy calculations, etc). Add config + npm script; cover the highest-value pure functions first.

**T48 — Playwright E2E tests**
Set up Playwright for end-to-end browser tests. Cover the golden path (type a full round, see result screen) plus key edge cases (caps lock warning, Tab-to-restart, mode/duration switching). Decide whether it also covers PvC/PvP flows once those land (T49/T50).

---

## Phase 16 — Game Modes

**T49a — Route-based navigation (precursor to T49/T50)**
Replace the `tab`-state branching in `GameApp.tsx` with real Next.js routes: `app/page.tsx` (solo, current default), `app/pvc/page.tsx`, `app/pvp/page.tsx`, `app/stats/page.tsx`, `app/leaderboard/page.tsx`, `app/achievements/page.tsx`. Shared chrome (header, `TypingHands`, `AchievementToast`, session/progression hooks) moves into a layout wrapping these routes. `TabNav` becomes `<Link>`-based instead of `setState`-based. Goal: stop `GameApp.tsx` from growing into a god-component as game modes are added — each mode gets its own route/file instead of another branch on shared state.

**T49 — PvC (Player vs Computer) mode**
Add a PvC mode with three difficulty tiers: easy, medium, hard, at `app/pvc/page.tsx` (after T49a). Frontend-only, no AGS backend needed for the race itself.

Architecture: run a second independent instance of `gameReducer`/`createInitialState` for the bot, fed by a synthetic "bot driver" that dispatches the same `KEYSTROKE`/`INPUT_CHANGE`/`BACKSPACE` actions on a timer instead of real keyboard events. This gives the bot's `GameState` the identical shape as the player's, so `WordContainer` and `Result`'s existing WPM/accuracy computation render/score the bot for free — no bespoke bot-progress or bot-scoring logic needed.

- Bot races through the *same* `words` array as the player (not an independently generated stream), so progress is directly comparable.
- Shared single timer: one `TICK` interval drives both reducers. The bot driver only starts when the player's first real keystroke starts the timer (existing `hasStartedRef` gate) — bot never moves before the player does.
- Difficulty tunes two independent knobs: pace (target chars/sec + jitter, so it doesn't feel metronomic) and two distinct mistake behaviors per word — (1) *slip-and-correct*: wrong keystroke → backspace → right char → correct word submitted (costs time, not accuracy), (2) *slip-and-ship*: wrong keystroke left uncorrected, wrong word submitted as-is (costs accuracy, not time). Harder difficulties lower both mistake probabilities and skew the mix toward slip-and-correct.
- Layout: stacked, not side-by-side — player's full 3-line `WordContainer` on top, bot's below in a visually quieter/compact form (single-line, no caret particle trail) so it reads as secondary and doesn't double the Three.js render cost.
- Only one `TypingHands` animation, reflecting the player's real keystrokes — the bot driver dispatches into its own reducer instance and never touches `keystrokeRef`, so this is already satisfied by construction, not a thing to build.
- New achievements (add to `achievements-manifest.ts`, manual-unlock pattern like `perfectionist`): per-difficulty first win (`pvc-win-easy`/`pvc-win-medium`/`pvc-win-hard`), hard-bot win streak (e.g. 3 or 5 in a row), flawless victory (beat any difficulty at 100% accuracy), and cumulative PvC win milestones (e.g. 10/50/100 wins, volume-achievement pattern like `words-1000`).
- Confirm during implementation whether PvC results need any AGS involvement at all (e.g. a `pvc-wins` stat feeding the milestone/streak achievements above) or can stay purely local/session state — the streak and milestone achievements likely need *some* persisted counter (CloudSave or a new stat), even though the race simulation itself is frontend-only.

**T50 — PvP (Player vs Player) mode**
Add a real-time PvP mode at `app/pvp/page.tsx` (after T49a). AGS-backed — evaluate AGS Session/Lobby/Matchmaking services for matching and real-time state sync; confirm whether AMS (AccelByte Multiplayer Servers) is actually needed or if Session + Lobby pub/sub is sufficient for a text-typing race (likely no dedicated game server required, since there's no authoritative simulation to run server-side). Scope matchmaking (quick match vs invite-a-friend), race sync (progress updates), and result/leaderboard integration. Layout should reuse the stacked player-vs-opponent race view established in T49, swapping the bot's simulated reducer for the remote player's synced state.
