/** @type {import('next').NextConfig} */
const nextConfig = {
  /** 避免 Turbopack 解析 `@cursor/sdk` 内联的 `*.LICENSE.txt`（Unknown module type） */
  serverExternalPackages: ['@cursor/sdk'],
  experimental: {
    serverActions: {
      allowedOrigins: ['4moredos.org', '4moredos.org'],
    },
  },
}

module.exports = nextConfig
