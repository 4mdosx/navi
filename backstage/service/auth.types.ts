import { z } from 'zod'

export type SessionPayload = {
  expiresAt: Date
}

/** TOTP 登录表单（与 `app/login` 六位数验证码一致） */
export const TotpLoginSchema = z.object({
  code: z.string().length(6),
})

export type TotpLoginInput = z.infer<typeof TotpLoginSchema>
