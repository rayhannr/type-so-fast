'use client'

export const ThemeToggle = () => {
  const toggle = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // localStorage unavailable; theme still applies for this visit
    }
  }

  // both icons are rendered and CSS picks one, so the markup never depends
  // on the client-only theme value (no hydration mismatch, no icon flash)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light/dark theme"
      className="text-muted hover:text-active transition-colors cursor-pointer p-1"
    >
      <svg
        className="w-5 h-5 hidden theme-dark:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          strokeLinecap="round"
          d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
        />
      </svg>
      <svg
        className="w-5 h-5 hidden theme-light:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
      </svg>
    </button>
  )
}
