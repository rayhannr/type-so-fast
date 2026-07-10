# Export rules

- Do not export a variable, function, constant, or type immediately when defining it.
- Only add `export` once it is actually imported/used by another file.
- Remove `export` keywords that are no longer used by any other file.

# Control flow

- No nested ternaries (a ternary whose consequent or alternate is itself another ternary). Use an if/else chain, an early return, or a lookup table/object map instead. A single-level ternary is fine.

# Naming rules

- Don't suffix a variable with `Query` (e.g. `recordsQuery`) just because it holds a `useQuery`/`useMutation` result. Assign it to the plain resource name instead (`records`, `stats`, `history`) — or a short prefixed variant if it needs disambiguating from another value in scope (e.g. `cloudRecords` vs `localRecords`) — never `recordsQuery`/`recordsData`.
- Prefer domain-accurate naming over generic role labels — e.g. use `local`/`cloud` for localStorage-backed vs AGS-backed state, not `guest`/`user` (a signed-in player without an AGS session is still a real player, not a "guest").

# Data fetching (React Query)

- All client-side API calls go through `lib/queries.ts` as `useQuery`/`useMutation` hooks that call `axios` directly inline — there is no separate `lib/api.ts` wrapper layer, and no plain imperative `axios`/`fetch` calls in components.
- Keep the query/mutation result as one object under the plain resource name (`const records = useRecordsQuery(session)`) and dot-access what you need (`records.data`, `records.isFetching`) at the call site — don't destructure-and-rename (`const { data: records, isLoading } = ...`). Destructuring/renaming is fine when the destructured value is handed further down (e.g. a prop, a dependency array) where the object itself doesn't matter, not as the default style.
- A hook should `return useQuery(...)`/`return useMutation(...)` as-is. Only wrap it in a custom return object when the *data itself* needs reshaping (e.g. raw achievement entries → a `Set` of codes) — spread the original result (`{ ...query, data: ... }`) rather than hand-picking fields. Don't gate `isLoading`/`isFetching`/`isError` by hand for a disabled query — a query with `enabled: false` never leaves `fetchStatus: 'idle'`, so those already report `false` on their own.
- Use `isFetching`, not `isLoading`, when showing a loading indicator. `isLoading` is only true on the very first fetch before any data exists — it stays `false` during a background refetch (e.g. after `invalidateQueries` from a mutation), so it under-reports when data is stale and being refreshed.
- In a mutation's `onSuccess`, prefer `queryClient.setQueryData(key, value)` over `invalidateQueries` when the mutation already computed the exact resulting value client-side (e.g. saving a records list we just built). Reserve `invalidateQueries` for values only the server can compute (aggregated stats, leaderboard rank).
- Query keys fall back to a `'local'` (or per-resource empty-string) bucket when there's no AGS session, so guest data never shares a cache entry with a signed-in user's data on the same device.
- A localStorage-backed local fallback belongs in the query's own `queryFn`/`initialData` only when the existing storage format is a plain JSON-able value owned by that hook. Don't force an already-bespoke local format (e.g. a raw hex string) through a generic JSON local-storage helper — that silently breaks existing users' saved data. Leave that one's local handling where it already lives.
- `await mutateAsync(...)` must be wrapped in `try/catch` (or `.catch(...)`) at the call site — unlike `.mutate(...)`, a rejected `mutateAsync` throws into the calling code, and an unhandled rejection there is an uncaught error, not just a `mutation.isError` flag. Only reach for `mutateAsync` when the caller genuinely needs to sequence on completion (e.g. don't fire a second dependent mutation until the first lands) or needs the resolved value inline — `.mutate(...)` is the default otherwise.

# Comments

- Do not write comments that reference the past state of the code, a prior refactor, or what a file/function "used to" or "no longer" do (e.g. "removed since X no longer needs this", "changed because this file no longer does Y"). Once the refactor lands, that context is meaningless to a future reader who never saw the old version — it just raises unanswerable questions about what the old behavior even was.
- Comments must describe the current code as it stands, not the diff that produced it. If a comment only makes sense by knowing what the code used to look like, delete it — put that context in the commit message/PR description instead.
- Before adding a comment, ask whether it would still make sense to someone with no memory of this chat session — not just someone unfamiliar with the code, but someone who never saw the task, the prior version, or the reasoning that led here. If it only makes sense with that session's context, it doesn't belong in the file at all.

# Module boundaries

- A component must not import from another component file just to reuse a type or helper (e.g. a leaf component importing a parent's state type). Shared types/logic move to `lib/` so both sides depend downward on the same module instead of on each other.

# AGS calls

- When calling an AccelByte Gaming Services endpoint from `lib/ags/*.ts`, use the matching official `@accelbyte/sdk-*` package (e.g. `UserProfileApi` from `@accelbyte/sdk-basic`, `GameSessionApi` from `@accelbyte/sdk-session`) via `createSdk(accessToken)` — not a raw `axios` call — so request/response shapes stay generated from AccelByte's spec instead of hand-maintained.
- Import the API function directly (`import { UserProfileApi } from '@accelbyte/sdk-basic'`) — don't import the package's namespace object and destructure off it (`import { Basic } from '@accelbyte/sdk-basic'; const { UserProfileApi } = Basic`). The namespace object is a re-export convenience, not the intended usage.
- The generated SDK methods don't validate request bodies at runtime (only responses go through Zod) — a generated request type marking a field required doesn't mean the real endpoint needs it. If a partial/valid request doesn't satisfy the generated TS type, cast rather than reaching for raw `axios`.
- Only fall back to raw `axios` against the documented REST path when the SDK's generated client is actually broken for that call (wrong URL, wrong verb, a response shape it can't parse, etc — not just an overly strict request type). Record the specific defect in a comment when doing this, so it's clear the raw call is a workaround and not the default style.
- If no `@accelbyte/sdk-*` package exists yet for a service you need, check npm for one before assuming raw REST is required — e.g. `@accelbyte/sdk-basic` isn't installed by default in this repo but does exist and should be added.
- When a UI needs to distinguish failure causes, use the AGS error response's `name`/`errorCode` (e.g. `LeadershipRequired`, `JoinNotAllowedInvalidCode`, `VersionMismatch`) to pick the specific user-facing message — don't string-match on `errorMessage` text or collapse everything into one generic "something went wrong". The API route should surface the AGS error identifier (pass `name`/`errorCode` through in its error response) so the client can branch on it; a generic fallback message is only for codes the UI doesn't specifically handle.

# Dependencies

- Pin every direct dependency in `package.json` to an exact version (no `^`, `~`, or bare major like `"4"`) — if `package-lock.json` is ever lost, a fresh install must still land on the same versions.
