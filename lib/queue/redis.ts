import dotenv from 'dotenv'

// 환경 변수 로드
dotenv.config({ path: '.env.local' })

// Use Redis connection URL
// BullMQ will handle the Redis client automatically

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

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
