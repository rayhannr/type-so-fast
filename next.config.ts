import { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    const goBackendUrl = process.env.GO_BACKEND_URL
    if (!goBackendUrl) return []

    return [
      {
        source: '/api/:path*',
        destination: `${goBackendUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
