import { z } from 'zod'

export type SessionPayload = {
  expiresAt: Date
  pinEpoch: string
}

export const PIN_LENGTH = 4

export const PinSchema = z
  .string()
  .regex(new RegExp(`^\\d{${PIN_LENGTH}}$`), `PIN 需为 ${PIN_LENGTH} 位数字`)

export const SetupPinSchema = z
  .object({
    pin: PinSchema,
    confirmPin: PinSchema,
  })
  .refine((value) => value.pin === value.confirmPin, {
    message: '两次 PIN 不一致',
    path: ['confirmPin'],
  })

export const UnlockPinSchema = z.object({
  pin: PinSchema,
})

export const UpdatePinSchema = z
  .object({
    currentPin: PinSchema,
    pin: PinSchema,
    confirmPin: PinSchema,
  })
  .refine((value) => value.pin === value.confirmPin, {
    message: '两次 PIN 不一致',
    path: ['confirmPin'],
  })

export type SetupPinInput = z.infer<typeof SetupPinSchema>
export type UnlockPinInput = z.infer<typeof UnlockPinSchema>
export type UpdatePinInput = z.infer<typeof UpdatePinSchema>
export type PinFieldErrors = Record<string, string[] | undefined>
