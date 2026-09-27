import { pageMetadata } from '@/lib/metadata'
import { Suspense } from 'react'
import { PvpGame } from '@/components/PvpGame'

export const metadata = pageMetadata(
  'vs Player | TypeSoFast!',
  'Quick match against a random opponent and race to see who types faster.'
)

export default function PvpPage() {
  return (
    <Suspense>
      <PvpGame />
    </Suspense>
  )
}
