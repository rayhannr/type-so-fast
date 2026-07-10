import { Metadata } from 'next'
import { FriendsTab } from '@/components/FriendsTab'

export const metadata: Metadata = {
  title: 'TypeSoFast! — Friends',
  description: 'Add friends with a friend code, see who is online, and invite them to a typing race.',
}

export default function FriendsPage() {
  return <FriendsTab />
}
