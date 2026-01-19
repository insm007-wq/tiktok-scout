import dotenv from 'dotenv'

// 환경 변수 로드
dotenv.config({ path: '.env.local' })

// Use Redis connection URL
// BullMQ will handle the Redis client automatically

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redisConnection = {
  connection: {
    url: redisUrl,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    keepAlive: 30000,
    tls: {}  // Upstash는 TLS/SSL 필수
  }
}
