import { useClaimGlobalAchievementMutation, useCommunityBadgeOwnersQuery, useGlobalAchievementsQuery } from '@/lib/queries/achievements'
import { agsErrorMessage, AgsSession } from '@/lib/queries/shared'
import { CommunityBadge } from './CommunityBadge'

// AGS claim errorCodes. The claim button only shows when AGS reports the reward claimable, so
// these come from a stale page, e.g. a second click before the refetch lands.
const CLAIM_ERROR_MESSAGES: Record<number, string> = {
  40245: 'The goal has no progress yet, so there is nothing to claim.',
  40344: 'Only players who helped reach the goal can claim the badge.',
  40346: "You've already claimed this badge."
}

interface Props {
  session: AgsSession
}

const formatCount = (value: number) => Math.floor(value).toLocaleString('en-US')

export const CommunityGoals = ({ session }: Props) => {
  const goals = useGlobalAchievementsQuery(session)
  const badgeOwners = useCommunityBadgeOwnersQuery()
  const claim = useClaimGlobalAchievementMutation(session)

  if (goals.isError) return <p className="text-center text-xs text-muted mb-6">Couldn&apos;t load the community goal. Try again later.</p>
  if (!goals.data?.length) return null

  return (
    <section className="mb-8" aria-label="Community goals">
      <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Community goal</h2>
      <ul className="flex flex-col gap-3">
        {goals.data.map(goal => {
          const fill = goal.goalValue > 0 ? Math.min(100, (goal.latestValue / goal.goalValue) * 100) : 0
          const claimed = goal.achieved && goal.myContribution > 0 && !goal.canClaimReward
          const iconUrl = goal.achieved ? goal.unlockedIconUrl : goal.lockedIconUrl

          return (
            <li key={goal.code} className="rounded-lg border border-solid border-edge bg-surface px-4 py-4">
              <div className="flex flex-row items-center gap-4">
                {iconUrl && <img src={iconUrl} alt="" width={64} height={64} className="shrink-0 w-16 h-16" />}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-row items-baseline justify-between gap-4">
                    <p className="font-semibold text-sm text-active">{goal.name}</p>
                    <span className="text-xs text-muted tabular-nums">
                      {formatCount(goal.latestValue)} / {formatCount(goal.goalValue)}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{goal.description}</p>
                </div>
              </div>

              <div
                className="mt-3 h-1.5 rounded-full bg-canvas overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={goal.goalValue}
                aria-valuenow={Math.min(goal.latestValue, goal.goalValue)}
                aria-label={`${goal.name} progress`}
              >
                <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${fill}%` }} />
              </div>

              {goal.myContribution > 0 && <p className="mt-3 text-xs text-muted">You&apos;ve added {formatCount(goal.myContribution)}.</p>}
              {goal.myContribution === 0 && !goal.achieved && (
                <p className="mt-3 text-xs text-muted">Finish a game to add your words and earn the badge.</p>
              )}

              {goal.topContributors.length > 0 && (
                <ol className="mt-3 flex flex-col gap-1 text-xs">
                  {goal.topContributors.map((contributor, index) => (
                    <li key={contributor.userId} className="flex flex-row justify-between gap-4">
                      <span className={contributor.userId === session.userId ? 'text-accent' : 'text-active'}>
                        <span className="text-muted tabular-nums mr-2">{index + 1}</span>
                        {contributor.displayName}
                        {badgeOwners.data.has(contributor.userId) && <CommunityBadge />}
                      </span>
                      <span className="text-muted tabular-nums">{formatCount(contributor.contributedValue)}</span>
                    </li>
                  ))}
                </ol>
              )}

              {goal.canClaimReward && (
                <button
                  type="button"
                  onClick={() => claim.mutate(goal.code)}
                  disabled={claim.isPending}
                  className="mt-4 px-3 py-1 text-xs rounded-md bg-accent text-black font-semibold cursor-pointer hover:opacity-90 disabled:cursor-default disabled:opacity-50 transition-opacity"
                >
                  {claim.isPending ? 'Claiming…' : 'Claim badge'}
                </button>
              )}
              {claimed && (
                <p className="mt-4 text-xs text-accent">
                  Badge claimed
                  <CommunityBadge />
                </p>
              )}
              {goal.achieved && goal.myContribution === 0 && (
                <p className="mt-4 text-xs text-muted">Goal reached. The badge went to the players who helped get here.</p>
              )}
              {claim.isError && (
                <p className="mt-2 text-xs text-error">
                  {agsErrorMessage(claim.error, CLAIM_ERROR_MESSAGES, "Couldn't claim the badge. Try again.")}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
