export interface AchievementManifestEntry {
  code: string
  name: string
  description: string
}

// display metadata for the achievements configured in the AGS Admin Portal;
// unlock state comes from the fetched set in useAgsSession
export const achievementsManifest: AchievementManifestEntry[] = [
  { code: 'speed-demon', name: 'Speed Demon', description: 'Reach 100 WPM in a single game' },
  { code: 'perfectionist', name: 'Perfectionist', description: 'Finish a game with 100% accuracy' },
  { code: 'dedicated-typist', name: 'Dedicated Typist', description: 'Play 10 games' },
  { code: 'century-club', name: 'Century Club', description: 'Play 100 games' },
  { code: 'first-game', name: 'First Game', description: 'Play your first game' },
  { code: 'warm-up-wpm', name: 'Warm Up', description: 'Reach 10 WPM in a single game' },
  { code: 'streak-7', name: 'Week Warrior', description: 'Play at least one game a day for 7 days in a row' },
  { code: 'streak-30', name: 'Monthly Master', description: 'Play at least one game a day for 30 days in a row' },
  { code: 'streak-100', name: 'Centurion', description: 'Play at least one game a day for 100 days in a row' },
  { code: 'streak-250', name: 'Iron Will', description: 'Play at least one game a day for 250 days in a row' },
  { code: 'streak-365', name: 'Full Year', description: 'Play at least one game a day for 365 days in a row' },
  { code: 'streak-500', name: 'Unstoppable', description: 'Play at least one game a day for 500 days in a row' },
  { code: 'streak-750', name: 'Titan', description: 'Play at least one game a day for 750 days in a row' },
  { code: 'streak-1000', name: 'Legend', description: 'Play at least one game a day for 1000 days in a row' },
]
