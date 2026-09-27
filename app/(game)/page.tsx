import { pageMetadata } from '@/lib/metadata'
import { SoloGame } from '@/components/SoloGame'

export const metadata = pageMetadata(
  'TypeSoFast! Typing Speed Test in English and Indonesian',
  'Free typing speed test in English and Indonesian. Practice solo, race the computer, or go 1v1 with another player. See your WPM and personal bests.'
)

export default function Home() {
  return <SoloGame />
}
