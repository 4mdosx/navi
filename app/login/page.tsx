import { redirect } from 'next/navigation'
import { isPinConfigured } from '@/backstage/service/pin.service'
import { verifySession } from '@/backstage/service/auth.service'
import PinAccessForm from './pin-access-form'

export default async function LoginPage() {
  const configured = await isPinConfigured()
  const session = await verifySession()
  if (configured && session.isAuth) {
    redirect('/')
  }

  return <PinAccessForm mode={configured ? 'unlock' : 'setup'} />
}
