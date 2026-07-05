# type-so-fast — Task Backlog

## Phase 1 — Logic Optimization

**T1 — Consolidate state into useReducer** ✓ Done
Replace the 11 separate `useState` calls for game counters with a single `useReducer`. Eliminates multiple re-renders per keystroke and makes state transitions explicit and testable.

**T2 — Fix stale closure bugs** ✓ Done
- `inputHandler` checks `totalKeyStrokes === 0` via a stale memo closure — replace with a `useRef` to reliably fire the timer on the true first keystroke.
- The `useEffect` that saves records to localStorage can double-fire when both `timer` and `correctKeystroke` change in the same tick — add a `hasSaved` ref guard.

**T3 — Fix double setState in changeHandler** ✓ Done
When input ends with a space, `changeHandler` calls `setWordInput` twice (once with the full string, once with `''`), causing two renders. Collapse into a single conditional set.

---

## Phase 2 — AGS Foundation

**T4 — SDK Setup** ✓ Done
Install all required AGS SDK packages and wire them into the Vite/React app with a shared SDK instance. Packages needed:
- `@accelbyte/sdk` — core SDK instance (already in package.json)
- `@accelbyte/sdk-iam` — Device ID login (already in package.json)
- `@accelbyte/sdk-leaderboard` — fetch rankings and submit scores
- `@accelbyte/sdk-statistics` — submit and read stat items
- `@accelbyte/sdk-cloudsave` — user record read/write
- `@accelbyte/sdk-achievement` — read and unlock achievements

Also create the IAM OAuth client (Public, Device Auth grant type enabled) in Admin Portal.

**T5 — Device ID Login** ✓ Done
Implement anonymous login via IAM Device ID so each browser/device gets a persistent identity with no sign-up friction.

**T6 — Random Display Name** ✓ Done
Generate and persist a random `{adjective} {noun}` display name per device (stored in AGS CloudSave or localStorage as fallback) to represent the device on the leaderboard.

---

## Phase 3 — Leaderboard

**T7 — Leaderboard Config** ✓ Done
AGS leaderboard created: code `wpm-alltime`, backed by `best-wpm` stat, descending, all-time.

**T8 — Leaderboard UI** ✓ Done
Integrate leaderboard API — submit WPM score after each game, fetch and display a global top-N table showing `{adjective} {noun}` names and WPM scores.

---

## Phase 4 — Statistics

**T9 — Statistics Config** ✓ Done
AGS stat configurations created:
- `best-wpm` — MAX aggregation, client-set
- `games-played` — increment-only, client-set
- `total-words-typed` — increment-only, client-set

**T10 — Statistics Integration** ✓ Done
Submit stat increments after each completed game (`games_played +1`, `total_words_typed +N`, `best_wpm` update); display personal stats in the result panel.

---

## Phase 5 — Cloud Save

**T11 — CloudSave** ✓ Done
Migrate personal best records from localStorage to AGS CloudSave (user-level) so records survive cache clears and carry across devices.

---

## Phase 6 — Achievements

**T12 — Achievements Config** ✓ Done
AGS achievement configs created:
- `speed-demon` — stat `best-wpm` ≥ 100
- `perfectionist` — manual client trigger (accuracy = 100%)
- `dedicated-typist` — stat `games-played` ≥ 10
- `century-club` — stat `total-words-typed` ≥ 1000

**T13 — Achievements Integration** ✓ Done
Unlock achievements client-side after each game based on result; show a toast/badge notification when an achievement is newly unlocked.

---

## Phase 7 — UI & Visual Polish

**T14 — Reactive Particle Background**
Add a Three.js particle field behind the typing area. Particles drift faster as WPM climbs, scatter red on wrong keystrokes, and slow to a calm fade when the timer hits zero. Wire to existing `correctKeystroke` / `wrongKeystroke` state.

**T15 — Keystroke Ripple Effect**
Each correct keypress emits a subtle ripple/shockwave on the input area. Wrong keys flash a harsh red pulse. CSS/canvas-based — gives immediate tactile feedback the current UI lacks.

**T16 — 3D Results Podium**
Replace the flat Tailwind bar chart in the Results screen with a Three.js 3D podium — gold/silver/bronze columns extruding upward with staggered rise animation and WPM numbers floating above.

**T17 — Live WPM Graph**
Real-time SVG/canvas line graph that plots WPM sampled every 5–10 seconds during the game. Shown in the results screen as a "your speed curve".

**T18 — Word Streak Glow**
Current word text gets a growing CSS glow/aura as the consecutive-correct-word streak climbs. Resets to neutral on a mistake. Pure Tailwind dynamic classes.
