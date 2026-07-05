import { getTopLeaderboard } from '@/lib/ags/leaderboard'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') ?? '10')
    const entries = await getTopLeaderboard(limit)
    return Response.json(entries)
  } catch (err) {
    console.error('[leaderboard] GET failed:', err)
    return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
