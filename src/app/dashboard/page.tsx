
import { getUser } from '@/lib/dal'
import { logout } from '@/app/actions/auth'
import Link from 'next/link'

export default async function Dashboard() {
  const user = await getUser()
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name}!</p>
      <Link href="/">Home</Link>
      <button onClick={logout}>Log out</button>
    </div>
  )
}
