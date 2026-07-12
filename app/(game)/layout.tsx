'use client'

import { AccentPicker } from '@/components/AccentPicker'
import { Heading } from '@/components/Heading'
import { LevelBadge } from '@/components/LevelBadge'
import { PendingInviteBanner } from '@/components/PendingInviteBanner'
import { SoundToggle } from '@/components/SoundToggle'
import { TabNav } from '@/components/TabNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AgsSessionProvider, useAgsSessionContext } from '@/lib/ags/AgsSessionContext'
import { useProgressionQuery } from '@/lib/queries/cloudsave'

const GameChrome = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAgsSessionContext()
  const progression = useProgressionQuery(session)

  return (
    <div className="relative font-inter min-h-screen max-w-5xl mx-auto px-6 md:px-10 pt-8 pb-16">
      <header className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Heading />
        <div className="flex flex-row items-center gap-2 sm:gap-3">
          <LevelBadge xp={progression.data?.xp ?? 0} />
          <AccentPicker session={session} />
          <SoundToggle />
          <ThemeToggle />
          <a
            href="https://github.com/rayhannr/type-so-fast"
            target="_blank"
            rel="noreferrer"
            aria-label="Source code on GitHub"
            className="text-muted hover:text-active transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </header>

      <TabNav />

      {children}

      <PendingInviteBanner session={session} />
    </div>
  )
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgsSessionProvider>
      <GameChrome>{children}</GameChrome>
    </AgsSessionProvider>
  )
}
