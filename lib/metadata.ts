import { Metadata } from 'next'

// Next.js merges metadata shallowly, so a page that sets `openGraph` replaces
// the layout's block entirely rather than merging into it. Every page therefore
// has to spell out the full block, which is what this builds.
export const pageMetadata = (title: string, description: string): Metadata => ({
  title,
  description,
  openGraph: { title, description, type: 'website' },
  twitter: { card: 'summary', title, description }
})
