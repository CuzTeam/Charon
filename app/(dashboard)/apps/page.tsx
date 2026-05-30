import { getSessionFromCookies } from '@/lib/session'
import { redirect } from 'next/navigation'
import { AppsClient } from '@/components/user/apps-client'

export default async function AppsPage() {
  const session = await getSessionFromCookies()
  if (!session) redirect('/login')
  return <AppsClient userId={session.user.id} />
}
