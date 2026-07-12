import { Metadata } from 'next'
import { SoloGame } from '@/components/SoloGame'

export const metadata: Metadata = {
  title: 'TypeSoFast!',
  description: 'How fast can you type?'
}

export default function Home() {
  return <SoloGame />
}
