import type { Metadata } from 'next'
import { GameApp } from '@/components/GameApp'

export const metadata: Metadata = {
  title: 'TypeSoFast!',
  description: 'How fast can you type in Indonesian?',
}

export default function Home() {
  return <GameApp />
}
