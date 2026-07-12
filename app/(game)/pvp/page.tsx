import { Metadata } from 'next'
import { Suspense } from 'react'
import { PvpGame } from '@/components/PvpGame'

export const metadata: Metadata = {
  title: 'TypeSoFast! — vs Player',
  description: 'Quick match against a random opponent and race to see who types faster.'
}

export default function PvpPage() {
  return (
    <Suspense>
      <PvpGame />
    </Suspense>
  )
}
