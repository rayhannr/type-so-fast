import type { Metadata } from 'next'
import { RoomGame } from '@/components/RoomGame'

export const metadata: Metadata = {
  title: 'TypeSoFast! — Room',
  description: 'Create or join a room and race up to 5 players with a shareable code.',
}

export default function RoomPage() {
  return <RoomGame />
}
