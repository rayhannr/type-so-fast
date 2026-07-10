import { useAchievementListQuery } from '@/lib/queries/achievements'
import type { AgsSession } from '@/lib/queries/shared'

interface Props {
  session: AgsSession | null
}

export const AchievementsTab = ({ session }: Props) => {
  const achievements = useAchievementListQuery(session)
  const isLoggedIn = !!session

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      {!isLoggedIn && (
        <p className="text-center text-xs text-muted mb-6">Offline — progress is tracked once the game connects.</p>
      )}
      {achievements.isFetching && <p className="text-center text-xs text-muted mb-6">Loading achievements…</p>}
      {achievements.isError && (
        <p className="text-center text-xs text-muted mb-6">Couldn&apos;t load achievements — try again later.</p>
      )}
      <ul className="flex flex-col gap-3">
        {(achievements.data ?? []).map((achievement) => (
          <li
            key={achievement.code}
            className={`flex flex-row items-center gap-4 rounded-lg border border-solid border-edge bg-surface px-4 py-3 ${
              achievement.unlocked ? '' : 'opacity-70'
            }`}
          >
            {achievement.unlocked ? (
              <svg
                className="w-6 h-6 shrink-0 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 shrink-0 text-muted" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <div>
              <p className={`font-semibold text-sm ${achievement.unlocked ? 'text-active' : 'text-muted'}`}>{achievement.name}</p>
              <p className="text-xs text-muted">{achievement.description}</p>
            </div>
            <span className={`ml-auto text-xs ${achievement.unlocked ? 'text-accent' : 'text-muted'}`}>
              {achievement.unlocked ? 'Unlocked' : 'Locked'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
