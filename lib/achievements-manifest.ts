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
]
