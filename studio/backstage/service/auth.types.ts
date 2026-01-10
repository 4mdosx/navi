import { z } from 'zod'

export type SessionPayload = {
  expiresAt: Date
}

export const LoginFormSchema = z.object({
  password: z.string().trim(),
})
