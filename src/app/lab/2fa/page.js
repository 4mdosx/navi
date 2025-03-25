import speakeasy from 'speakeasy'

export default function TwoFactorAuth() {
  const secret = speakeasy.generateSecret({
    name: '2fa',
  })
  return <div>
    <h1>Two Factor Authentication</h1>
    <p>Secret: {secret.base32}</p>
  </div>
}
