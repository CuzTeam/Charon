import { getSessionFromCookies } from '@/lib/session'
import { redirect } from 'next/navigation'
import { DinoGame } from '@/components/user/dino-game'

export default async function DinoGamesPage() {
  const session = await getSessionFromCookies()
  if (!session) redirect('/login')
  return <DinoGame userId={session.user.id} />
}
