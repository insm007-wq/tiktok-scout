import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // ✅ 보안 헤더 추가 (정적 파일 제외)
  async headers() {
    return [
      {
        // 정적 파일 제외: 이미지, 매니페스트, robots.txt, favicon 등
        source: '/((?!.*\\.(png|jpg|jpeg|gif|svg|ico|webmanifest|txt)$).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      // 정적 파일 캐싱 헤더
      {
        source: '/:path*.(png|jpg|jpeg|gif|svg|ico|webmanifest|txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig
