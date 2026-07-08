import { useEffect, useRef, useState } from 'react'
import type { AgsSession } from '@/lib/queries'
import type { UnlockedAchievement } from '@/lib/ags/achievements'
import type { XpGain } from '@/components/Result'
import type { Duration } from '@/components/DurationSelector'
import type { WordMode } from '@/lib/word-generators'
import { advanceStreak, advanceProgression, advancePvc, advancePvp, levelFromXp, HISTORY_LIMIT } from '@/lib/progress'
import type { Difficulty } from '@/lib/botDifficulty'
import { playFanfare } from '@/lib/sounds'
import {
  useRecordsQuery,
  useHistoryQuery,
  useStreakQuery,
  useProgressionQuery,
  usePvcProgressQuery,
  usePvpProgressQuery,
  useAchievementsQuery,
  useSaveRecordsMutation,
  useSaveHistoryMutation,
  useSaveStreakMutation,
  useSaveProgressionMutation,
  useSavePvcProgressMutation,
  useSavePvpProgressMutation,
  useSubmitStatsMutation,
  useProcessAchievementsMutation,
} from '@/lib/queries'

interface GameEndParams {
  timer: number
  correctKeystroke: number
  wrongKeystroke: number
  correction: number
  correctWords: number
  duration: Duration
  mode: WordMode
  session: AgsSession | null
  displayName: string | null
  pvc?: { difficulty: Difficulty; won: boolean }
  pvp?: { outcome: 'win' | 'lose' | 'tie' }
}

// runs once per finished round: computes the next records/history/streak/progression,
// persists them, submits stats, and diffs newly-unlocked achievements
export const useGameEndSync = ({
  timer,
  correctKeystroke,
  wrongKeystroke,
  correction,
  correctWords,
  duration,
  mode,
  session,
  displayName,
  pvc,
  pvp,
}: GameEndParams) => {
  const [xpGain, setXpGain] = useState<XpGain | null>(null)
  const [newAchievement, setNewAchievement] = useState<UnlockedAchievement | null>(null)
  const hasSavedRef = useRef(false)

  const records = useRecordsQuery(session)
  const history = useHistoryQuery(session)
  const streak = useStreakQuery(session)
  const progression = useProgressionQuery(session)
  const pvcProgress = usePvcProgressQuery(session)
  const pvpProgress = usePvpProgressQuery(session)
  const achievements = useAchievementsQuery(session)

  const saveRecordsMutation = useSaveRecordsMutation(session)
  const saveHistoryMutation = useSaveHistoryMutation(session)
  const saveStreakMutation = useSaveStreakMutation(session)
  const saveProgressionMutation = useSaveProgressionMutation(session)
  const savePvcProgressMutation = useSavePvcProgressMutation(session)
  const savePvpProgressMutation = useSavePvpProgressMutation(session)
  const submitStatsMutation = useSubmitStatsMutation(session)
  const processAchievementsMutation = useProcessAchievementsMutation(session)

  useEffect(() => {
    if (timer > 0) {
      hasSavedRef.current = false
      return
    }
    if (hasSavedRef.current) return
    hasSavedRef.current = true

    playFanfare()

    const userResult = Math.round((correctKeystroke * 12) / duration)
    if (userResult <= 0) {
      setXpGain(null)
      return
    }

    const newRecords = (records.data ?? [])
      .concat(userResult)
      .sort((a, b) => b - a)
      .slice(0, 5)

    const newHistory = (history.data ?? []).concat({ wpm: userResult, timestamp: Date.now() }).slice(-HISTORY_LIMIT)
    const newStreak = advanceStreak(streak.data ?? null, new Date())

    const accuracy = (correctKeystroke * 100) / (correctKeystroke + wrongKeystroke + correction)

    const {
      progression: newProgression,
      earnedXp,
      leveledUp,
    } = advanceProgression(progression.data ?? null, {
      wpm: userResult,
      accuracy,
      wordsTyped: correctWords,
      mode,
      duration,
    })
    setXpGain({ earned: earnedXp, totalXp: newProgression.xp, leveledUp })

    const newPvcProgress = pvc ? advancePvc(pvcProgress.data ?? null, pvc) : null
    const newPvpProgress = pvp ? advancePvp(pvpProgress.data ?? null, pvp) : null

    // these mutations write to the AGS CloudSave route when signed in, or localStorage
    // otherwise, and update the cache with the exact value on success either way
    saveRecordsMutation.mutate(newRecords)
    saveHistoryMutation.mutate(newHistory)
    saveStreakMutation.mutate(newStreak)
    saveProgressionMutation.mutate(newProgression)
    if (newPvcProgress) savePvcProgressMutation.mutate(newPvcProgress)
    if (newPvpProgress) savePvpProgressMutation.mutate(newPvpProgress)

    if (!session || !displayName) return

    submitStatsMutation.mutate(
      {
        wpm: userResult,
        wordsTyped: correctWords,
        displayName,
        duration,
        mode,
        xpEarned: earnedXp,
        level: levelFromXp(newProgression.xp),
      },
      {
        // stat-tied achievements (first-game, speed tiers, level/volume milestones) unlock
        // server-side when stats land, so diff them only after the submission settles
        onSettled: () => {
          processAchievementsMutation.mutate(
            {
              accuracy,
              previousCodes: [...achievements.data],
              streak: newStreak.currentStreak,
              perfectStreak: newProgression.perfectStreak,
              modesPlayed: newProgression.modesPlayed,
              durationsPlayed: newProgression.durationsPlayed,
              pvc: pvc && newPvcProgress ? { difficulty: pvc.difficulty, won: pvc.won, pvcProgress: newPvcProgress } : undefined,
              pvp: pvp && newPvpProgress ? { outcome: pvp.outcome, pvpProgress: newPvpProgress } : undefined,
            },
            {
              onSuccess: (newlyUnlocked) => {
                if (newlyUnlocked.length === 0) return
                setNewAchievement(newlyUnlocked[0])
              },
            }
          )
        },
      }
    )
  }, [timer, correctKeystroke])

  return { xpGain, newAchievement, dismissAchievement: () => setNewAchievement(null) }
}
