import { pageMetadata } from '@/lib/metadata'
import { RoomGame } from '@/components/RoomGame'

export const metadata = pageMetadata(
  'Room | TypeSoFast!',
  'Create or join a room and race up to 5 players with a shareable code.'
)

export default function RoomPage() {
  return <RoomGame />
}
