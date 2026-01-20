import dotenv from 'dotenv'

// 개발 환경에서만 .env.local 로드 (Railway/프로덕션에서는 자동 주입)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' })
}

// Use Redis connection URL
// BullMQ will handle the Redis client automatically

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

console.log(`[Redis] URL: ${redisUrl ? '✅ Configured' : '⚠️ Using default'}`)
console.log(`[Redis] NODE_ENV: ${process.env.NODE_ENV || 'development'}`)

// Lazy loading - 런타임에만 초기화되도록
let cachedConnection: any = null

export const redisConnection = {
  get connection() {
    if (!cachedConnection) {
      cachedConnection = {
        url: redisUrl,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        keepAlive: 30000,
        tls: {}  // Upstash는 TLS/SSL 필수
      }
    }
    return cachedConnection
  }
}
