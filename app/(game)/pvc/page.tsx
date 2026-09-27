import { pageMetadata } from '@/lib/metadata'
import { PvcGame } from '@/components/PvcGame'

export const metadata = pageMetadata(
  'vs Computer | TypeSoFast!',
  'Race a computer opponent to see who types faster.'
)

export default function PvcPage() {
  return <PvcGame />
}
