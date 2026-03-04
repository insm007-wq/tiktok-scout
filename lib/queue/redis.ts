/**
 * Redis connection configuration for BullMQ
 * Upstash: host/port/password + tls (권장 형식)
 * 로컬: url
 */

import { DEFAULT_REDIS_URL } from './constants'

type RedisConnectionOptions =
  | { url: string; maxRetriesPerRequest: null; enableReadyCheck: boolean; keepAlive: number; tls?: object }
  | { host: string; port: number; password: string; maxRetriesPerRequest: null; enableReadyCheck: boolean; keepAlive: number; tls: object }

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

function parseUpstashOptions(url: string): RedisConnectionOptions | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname?.includes('upstash.io')) return null
    const password = parsed.password || decodeURIComponent(parsed.username || '')
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      password,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      keepAlive: 30000,
      tls: {},
    }
  } catch {
    return null
  }
}

let cachedConnection: RedisConnectionOptions | null = null

export const redisConnection = {
  get connection(): RedisConnectionOptions {
    if (!cachedConnection) {
      const upstashOpts = parseUpstashOptions(redisUrl)
      if (upstashOpts) {
        cachedConnection = upstashOpts
      } else {
        cachedConnection = {
          url: redisUrl,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          keepAlive: 30000,
          ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
        }
      }
    }
    return cachedConnection
  },
}
