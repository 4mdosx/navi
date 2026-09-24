const allowedOrigins = (process.env.SERVER_ACTION_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    trustHostHeader: true, 
    serverActions: {
      allowedOrigins,
    },
  },
}

module.exports = nextConfig
