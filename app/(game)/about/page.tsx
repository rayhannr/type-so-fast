import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TypeSoFast! — About',
  description: 'A free typing speed test with solo practice, computer races, live 1v1 and room matches, leaderboards, and achievements.'
}

export default function AboutPage() {
  return (
    <div className="mt-8 space-y-6 text-sm leading-relaxed">
      <section>
        <h2 className="text-lg font-semibold text-active mb-2">What is TypeSoFast!?</h2>
        <p className="text-muted">
          TypeSoFast! is a free typing speed test. Type a passage as fast and accurately as you can, and see your words per minute (WPM) and
          accuracy the moment you finish.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-active mb-2">Ways to play</h2>
        <ul className="list-disc list-inside text-muted space-y-1">
          <li>Solo — practice at your own pace and track personal bests.</li>
          <li>Vs Computer — race against a computer opponent of adjustable speed.</li>
          <li>Vs Player — get matched instantly against a random opponent.</li>
          <li>Room — create or join a shareable room and race up to 5 players at once.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-active mb-2">Track your progress</h2>
        <p className="text-muted">
          Sign in to keep a history of your runs, build a daily streak, unlock achievements, and see how you rank on the global leaderboard.
        </p>
      </section>
    </div>
  )
}
