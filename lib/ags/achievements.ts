export interface UnlockedAchievement {
  achievementCode: string
  name: string
}

export interface AchievementInfo {
  code: string
  name: string
  description: string
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
  goalValue: number
  latestValue: number
  achieved: boolean
  myContribution: number
  canClaimReward: boolean
  topContributors: Contributor[]
}
