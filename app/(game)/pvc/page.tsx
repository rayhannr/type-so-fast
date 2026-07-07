import type { Metadata } from 'next'
import { PvcGame } from '@/components/PvcGame'

export const metadata: Metadata = {
  title: 'TypeSoFast! — vs Computer',
  description: 'Race a computer opponent to see who types faster.',
}

export default function PvcPage() {
  return <PvcGame />
}
