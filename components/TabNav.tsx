'use client'

import { useEffect, useRef, useState } from 'react'
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
  const scrollerRef = useRef<HTMLElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollShadows = () => {
    const el = scrollerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    updateScrollShadows()
    window.addEventListener('resize', updateScrollShadows)
    return () => window.removeEventListener('resize', updateScrollShadows)
  }, [])

  return (
    <div className="relative mt-8">
      <nav
        ref={scrollerRef}
        onScroll={updateScrollShadows}
        className="flex flex-row flex-nowrap justify-start md:justify-center gap-6 md:gap-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Sections"
      >
        {ROUTES.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            aria-current={pathname === route.href ? 'page' : undefined}
            className={`shrink-0 whitespace-nowrap pb-1 text-sm border-b-2 border-solid transition-colors ${
              pathname === route.href ? 'text-active border-accent' : 'text-muted border-transparent hover:text-active'
            }`}
          >
            {route.label}
          </Link>
        ))}
      </nav>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-canvas to-transparent transition-opacity ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-canvas to-transparent transition-opacity ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}
