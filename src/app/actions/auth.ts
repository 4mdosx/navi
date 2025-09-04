'use server'
import 'server-only'

import { deleteSession, createSession } from '@/modules/auth/service'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { verifyOTP } from '@/modules/2fa/service'

const LoginSchema = z.object({
  code: z.string().length(6),
})

export async function login(loginData: z.infer<typeof LoginSchema>) {
  const validatedFields = LoginSchema.safeParse({
    code: loginData.code,
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const result = await verifyOTP(process.env.TOTP_SECRET!, validatedFields.data.code)
  if (!result) {
    return {
      errors: {
        code: ['Invalid code'],
      },
    }
  }
  await createSession()
  redirect('/')
}

export async function logout() {
  deleteSession()
  redirect('/')
}
