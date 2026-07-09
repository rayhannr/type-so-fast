'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ROUTES = [
  { href: '/', label: 'Type' },
  { href: '/pvc', label: 'vs Computer' },
  { href: '/pvp', label: 'vs Player' },
  { href: '/friends', label: 'Friends' },
  { href: '/stats', label: 'Stats' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/achievements', label: 'Achievements' },
]

export const TabNav = () => {
  const pathname = usePathname()

  return (
    <nav className="flex flex-row justify-center gap-6 md:gap-8 mt-8" aria-label="Sections">
      {ROUTES.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          aria-current={pathname === route.href ? 'page' : undefined}
          className={`pb-1 text-sm border-b-2 border-solid transition-colors ${
            pathname === route.href ? 'text-active border-accent' : 'text-muted border-transparent hover:text-active'
          }`}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  )
}
