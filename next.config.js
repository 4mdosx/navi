/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['4moredos.org', '4moredos.org'],
    },
  },
}

module.exports = nextConfig
