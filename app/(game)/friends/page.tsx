import { pageMetadata } from '@/lib/metadata'
import { FriendsTab } from '@/components/FriendsTab'

export const metadata = pageMetadata(
  'Friends | TypeSoFast!',
  'Add friends with a friend code, see who is online, and invite them to a typing race.'
)

export default function FriendsPage() {
  return <FriendsTab />
}
