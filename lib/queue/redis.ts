/**
 * Redis connection configuration for BullMQ
 * Environment variables should be loaded at application entry point
 */

import { DEFAULT_REDIS_URL } from './constants'

/**
 * Redis connection options interface
 */
interface RedisConnectionOptions {
  url: string
  maxRetriesPerRequest: null
  enableReadyCheck: boolean
  keepAlive: number
  tls: Record<string, unknown>
}

/**
 * Validates Redis URL format
 * @param url - The Redis URL to validate
 * @returns true if URL is valid, false otherwise
 */
function validateRedisUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'redis:' || parsed.protocol === 'rediss:'
  } catch {
    return false
  }
}

const redisUrl = process.env.REDIS_URL || DEFAULT_REDIS_URL

if (!validateRedisUrl(redisUrl)) {
  throw new Error(`Invalid Redis URL format: ${redisUrl}`)
}

// Lazy loading - Connection is initialized at runtime
let cachedConnection: RedisConnectionOptions | null = null

export const redisConnection = {
  /**
   * Get or create Redis connection options for BullMQ
   * Uses lazy loading to defer initialization until first use
   */
  get connection(): RedisConnectionOptions {
    if (!cachedConnection) {
      cachedConnection = {
        url: redisUrl,
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false, // Improved performance
        keepAlive: 30000, // 30 second keep-alive
        tls: {}, // Upstash requires TLS/SSL connection
      }
    }
    return cachedConnection
  },
}
