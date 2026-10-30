# Global achievement: findings

What was learned while adding a community goal ("Ten Thousand Together") with a badge reward to type-so-fast on the `bahlil-etanol` internal namespace, 30 Oct 2026. Written as source material for the A9 blog post (global and collaborative achievements).

## What was set up in AGS

| Piece | Config |
|---|---|
| Event stat | `event-words-ten-thousand`: `setAsGlobal: true`, `globalAggregationMethod: TOTAL`, `setBy: SERVER`, increment only |
| Global achievement | `ten-thousand-together`: `global: true`, `incremental: true`, `statCode: event-words-ten-thousand`, `goalValue: 10000` |
| Currency | `COIN`, virtual, 0 decimals (only so the badge item can have a price) |
| Store | Draft `type-so-fast` (`91792dec…`), published as `159f7bba…` |
| Item | `badge-ten-thousand-together` (`43ae325f…`): in-game item, durable, not purchasable, max 1 per user, price 0 COIN, category `/badges` |
| Reward | `ten-thousand-together-badge`: on `achievementRewardClaimed` for `ten-thousand-together`, grants the badge, `maxAwarded: -1`, `maxAwardedPerUser: 1` (config below) |
| Admin client | `typesofast admin` gained `m_platform_store / g_entitlement` read, so the server can list who owns the badge. It also needs permission to update player stat items, so the server can write the event stat |

The full config is in `ags-config-export.json` (gitignored, secrets redacted).

## Why the goal runs on its own event stat

The first version put the global achievement on the lifetime stat `total-words-typed`. Testing showed that **AGS keeps accepting contributions after a global achievement's goal is reached**, and anyone who contributes afterwards can claim the reward. A player who joins after the community finished would get the same badge as the players who got it there.

AGS has no built-in way to close a global achievement:

- no end date or cycle on a global achievement
- no per-cycle global stat value
- `collaborative-progress reset` is labelled `[TEST FACILITY ONLY]`

The challenge service is time-boxed, but its goals are checked per player, so it can't express a community total.

So the event follows the pattern real community events use: a stat that exists only for the event.

- `event-words-ten-thousand` is `setBy: SERVER`, so players can't write it with their own token.
- The game server adds each finished game's words to it with the admin token, but only while the event achievement isn't reached yet (`status` 1, or no progress record).
- Once the goal is reached the server stops writing, so no new contributors appear, and only players who helped can claim the badge.

There's a small window: games finishing at almost the same moment as the goal can still slip in.

Verified with the goal temporarily set to 30:

- Player A typed 20 words, and player B's 15 took the total to 35, so the goal was reached.
- Player C joined afterwards and typed 25 words. The total stayed at 35, C's contribution stayed at 0, and C's claim was rejected.
- A and B could claim, and B received the badge.

Changing the stat of a global achievement that's already in progress fails with `Error code 40348` ("cannot update stat code of on going global achievement"), so the achievement had to be recreated under a new code. Progress records also outlive a deleted achievement, so the old ones were cleared with `collaborative-progress reset` first.

## How AGS behaves

### Global stats

- **Existing values are not backfilled.** Right after `total-words-typed` became global, the global value was 0, although 36 players had already typed 2,684 words.
- **The goal counts from when the stat became global, not from when the achievement was created.** A test achievement created later started with the stat's current global value (195), not 0.
- **Per-player values are untouched.** The existing per-player achievements on the same stat (`words-1000`, `words-10000`) keep working.
- The docs warn that switching Set as Global on a stat already tied to player data can make the global total inaccurate. On an internal namespace that didn't matter.

### Global achievements

- **They show up in the normal public achievement list.** `PublicListAchievements` returns them like any other achievement, with `global: true`. A personal list has to filter them out, or they sit as "Locked" for every player forever.
- **The progress record only exists after the first contribution.** `PublicListGlobalAchievements` returns nothing for an achievement nobody has contributed to yet, so treat a missing record as 0.
- **The progress response has no goal.** `latestValue` and `status` come from the global achievement endpoint, but `goalValue` only comes from the achievement catalog, so the two have to be merged.
- **`status` 2 means the goal is reached**, the same value as an unlocked player achievement.
- **Contributors** come from `ListGlobalAchievementContributors`, sortable by `contributedValue:desc`. A player's own contribution and `canClaimReward` come from `ListUserContributions`.
- **A player's contribution record seems to appear on their first stat update after the achievement exists.** A player who had typed before the achievement was created showed 0 until they played again, while another player's earlier words were counted after their next game. This was observed, not documented.

### Claiming the reward

- **Only contributors can claim.** A claim by a player with no contribution fails with `404`, `errorCode 40344`. Claiming a goal nobody has contributed to yet fails with `404`, `errorCode 40245`. The Go SDK's claim reader has no 404 case and turns both into an opaque error string, so the server calls the documented claim endpoint directly to pass the codes through.
- **A second claim fails with `400`, `errorCode 40346`** ("reward already claimed").
- **Claiming only records the claim.** The badge is granted separately, by the platform reward config reacting to the `achievementRewardClaimed` event.

### Reward config: the default works, but changes take effect late

The reward that grants the badge uses the documented defaults:

```json
{
  "eventTopic": "achievement",
  "userIdExpression": "$.[0].userId",
  "namespaceExpression": "$.[0].namespace",
  "rewardConditions": [
    {
      "eventName": "achievementRewardClaimed",
      "condition": "$.[?(@.achievementCode == \"ten-thousand-together\")]",
      "rewardItems": [{ "identityType": "ITEM_ID", "itemId": "<badge item id>", "quantity": 1 }]
    }
  ]
}
```

The condition sees the event's payload flat (`userId`, `achievementCode`, `namespace`, `status`, ...), even though the AGS event reference shows it wrapped in an `achievementRewardClaimed` object. With this config the badge was granted about 4 seconds after the claim.

What made this hard to find:

- **Reward changes don't apply right away.** A reward created or edited about a minute before a claim was ignored; one edited about two minutes before was applied. A claim made in that window grants nothing, and the claim can't be retried, because AGS already counts it as claimed (`40346`). Change rewards well before an event goes live, or before testing.
- **That delay produced a misleading result.** A claim right after switching a test reward to nested paths (`$.[0].achievementRewardClaimed.userId`) did grant the badge, but only because the service was still running the previous, flat config. Later claims against the nested config never granted anything.
- **`ags platform rewards match-event` didn't help.** It matched the flat payload with the default expressions, which turned out to be right, but nothing showed that the live config lagged behind.
- **The platform only accepts user and namespace expressions starting with `$.[0].`** (`^$|^\$\.\[0\]\.…`).

### Other platform gotchas

- **`maxAwarded: -1` means unlimited.** `0` is not unlimited.
- **Every item needs `regionData` with a price in the store's default region**, even a free, non-purchasable item (`regionData cannot be null`, then `Default region [US] is required`).
- **Real currencies can't be created in a game namespace** (`Error code 36172`). They belong to the publisher namespace (`bahlil`), which every game under it shares. A virtual currency in the game namespace avoids touching that.
- **Items exist only in the draft store until published.** Use `ags platform catalog-changes publish-all`.
- **The reward service has 11 trigger events across 4 topics:**
  - statistic: `statItemCreated`, `statItemUpdated`
  - statistic cycle: `statItemCycleUpdated`
  - achievement: `userAchievementUnlocked`, `achievementRewardClaimed`
  - user account: `userAccountCreated`, `gameUserAccountCreated`, `userAccountVerified`, `userAccountLinked`, `userAccountUpgraded`, `thirdPartyAccountCreated`

  Conditions are JSONPath filters over the event payload, and a reward can hold several.

### Showing badges on other players

- **Other players' entitlements are admin-only**, so the server lists badge owners with the admin token (`QueryEntitlementsByItemIds`, active only) and caches the result for a minute.
- **The item ID is looked up by SKU** (`PublicGetItemBySku`), which works with the admin token, so the code doesn't hard-code a namespace-specific item ID.

### What the player gets (state this in the blog post)

Once the community reaches the goal, every player who contributed before that moment sees a "Claim badge" button. Claiming grants the "Ten Thousand Together" badge: the AGS reward gives the player the badge store item (`badge-ten-thousand-together`, a durable in-game item in the published store), and AGS records that ownership as an entitlement on the player's account. The badge then shows as a star next to their name on the leaderboard, in room lobbies and in the contributor list. Players who join after the goal was reached don't get one.

## Code-side notes

- **Admin token cache bug (existing, fixed).** Go compares `time.Time` values with the monotonic clock, which pauses while the machine sleeps. After WSL was suspended, the cached admin token looked valid but AGS answered `token is expired`. The cache now compares wall-clock time (`time.Now().Round(0)`).
- **`ags` CLI vs `.env.local` admin client.** The admin client in `.env.local` only has the permissions the server needs. Config changes were made with a browser login (`ags auth login`) on a `bahlil-etanol` ags profile, which uses your own admin roles.

## Open items

- **Test users are still in the namespace:** "Verify One", "Verify Two" and "Verify Three", plus three test logins with no stats, and five event test users ("Event A", "Event B", "Event C" and two more).
  - "Verify One" and "Verify Three" are on the 15s leaderboard.
  - The test badge was revoked. Their words don't count toward the new event, which started at 0.
- **The goal is 10,000 words.** About 36 real players had typed 2,684 words in total before this, so check that the goal is still reachable.
