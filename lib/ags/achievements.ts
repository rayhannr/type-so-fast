export interface UnlockedAchievement {
  achievementCode: string
  name: string
}

export interface AchievementInfo {
  code: string
  name: string
  description: string
  lockedIconUrl: string
  unlockedIconUrl: string
  unlocked: boolean
}

interface Contributor {
  userId: string
  displayName: string
  contributedValue: number
}

export interface GlobalAchievement {
  code: string
  name: string
  description: string
  lockedIconUrl: string
  unlockedIconUrl: string
  goalValue: number
  latestValue: number
  achieved: boolean
  myContribution: number
  canClaimReward: boolean
  topContributors: Contributor[]
}
