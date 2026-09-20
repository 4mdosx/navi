import speakeasy from 'speakeasy'

export async function generateSecret(name: string) {
  return speakeasy.generateSecret({
    name,
  })
}

export async function verifyOTP(secret: string, otp: string) {
  const result = speakeasy.totp.verify({
    secret,
    token: otp,
    encoding: 'base32',
  })
  return result
}
