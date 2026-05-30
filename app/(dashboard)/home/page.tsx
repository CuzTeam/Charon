import { getSessionFromCookies } from '@/lib/session'
import { redirect } from 'next/navigation'
import { HomeClient } from '@/components/user/home-client'

export default async function HomePage() {
  const session = await getSessionFromCookies()
  if (!session) redirect('/login')
  return <HomeClient user={session.user} />
}
