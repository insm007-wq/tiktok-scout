import { Worker } from 'bullmq'
import { SearchJobData } from './search-queue'
import { redisConnection } from './redis'
import { searchTikTokVideos } from '@/lib/scrapers/tiktok'
import { searchDouyinVideosParallel } from '@/lib/scrapers/douyin'
import { searchXiaohongshuVideosParallel } from '@/lib/scrapers/xiaohongshu'
import { setVideoToCache } from '@/lib/cache'
import {
  DEFAULT_WORKER_CONCURRENCY,
  LOCK_DURATION,
  LOCK_RENEW_TIME,
  STALLED_INTERVAL,
  MAX_STALLED_COUNT,
  MAX_VIDEOS_PER_SEARCH,
  RATE_LIMITER_MAX,
  RATE_LIMITER_DURATION,
  QUEUE_NAME,
  RAILWAY_TIMEOUT,
} from './constants'

const CONCURRENCY = process.env.WORKER_CONCURRENCY ? parseInt(process.env.WORKER_CONCURRENCY) : DEFAULT_WORKER_CONCURRENCY
const RAILWAY_URL = process.env.RAILWAY_SERVER_URL
const RAILWAY_SECRET = process.env.RAILWAY_API_SECRET
const APIFY_KEY = process.env.APIFY_API_KEY

/**
 * Scrape videos via Railway server (production environment)
 * Falls back to local scraper if Railway is not available or fails
 * @param query - Search query
 * @param platform - Video platform (tiktok, douyin, or xiaohongshu)
 * @param dateRange - Optional date range for filtering results
 * @returns Array of videos or null if scraping fails
 */
async function scrapeViaRailway(
  query: string,
  platform: 'tiktok' | 'douyin' | 'xiaohongshu',
  dateRange?: string
): Promise<any[] | null> {
  if (!RAILWAY_URL || !RAILWAY_SECRET) {
    return null
  }

  try {
    const response = await fetch(`${RAILWAY_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': RAILWAY_SECRET,
      },
      body: JSON.stringify({
        query,
        platform,
        limit: MAX_VIDEOS_PER_SEARCH,
        dateRange,
      }),
      signal: AbortSignal.timeout(RAILWAY_TIMEOUT), // 2 minute timeout
    })

    const data = await response.json()

    if (response.ok && data.success && Array.isArray(data.videos)) {
      return data.videos
    }
    return null
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Worker] Railway scraping failed:', error instanceof Error ? error.message : String(error))
    }
    return null
  }
}

/**
 * Classifies scraping errors into specific error types for better debugging
 * @param error - The error to classify
 * @param platform - The platform where scraping failed
 * @returns Classified error with descriptive message
 */
function classifyScrapingError(error: unknown, platform: string): Error {
  const errorMessage = error instanceof Error ? error.message : String(error)

  if (errorMessage.includes('429')) {
    return new Error('429_RATE_LIMIT: API rate limit exceeded')
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
    return new Error('NETWORK_ERROR: Connection timeout or refused')
  }
  if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
    return new Error('AUTH_ERROR: Invalid API key or authorization')
  }
  if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('DNS')) {
    return new Error('DNS_ERROR: Cannot resolve host')
  }
  return new Error(`SCRAPING_ERROR: Failed to scrape ${platform}: ${errorMessage}`)
}

const worker = new Worker<SearchJobData>(
  QUEUE_NAME,
  async (job) => {
    const { query, platform, dateRange } = job.data

    try {
      await job.updateProgress(10)
    } catch (err) {
      // Progress update failure is non-critical, continue processing
    }

    let videos

    try {
      // Try scraping via Railway server first (production)
      videos = await scrapeViaRailway(query, platform, dateRange)

      // Fallback to local scrapers if Railway unavailable or failed
      if (!videos || videos.length === 0) {
        if (!APIFY_KEY) {
          throw new Error('APIFY_KEY environment variable not configured')
        }

        switch (platform) {
          case 'tiktok':
            videos = await searchTikTokVideos(query, MAX_VIDEOS_PER_SEARCH, APIFY_KEY, dateRange)
            break
          case 'douyin':
            videos = await searchDouyinVideosParallel(query, MAX_VIDEOS_PER_SEARCH, APIFY_KEY, dateRange)
            break
          case 'xiaohongshu':
            videos = await searchXiaohongshuVideosParallel(query, MAX_VIDEOS_PER_SEARCH, APIFY_KEY, dateRange)
            break
          default:
            throw new Error(`Unknown platform: ${platform}`)
        }
      }

      try {
        await job.updateProgress(80)
      } catch (err) {
        // Progress update failure is non-critical
      }

      // Smart retry logic for empty results (Cold Start handling)
      if (!videos || videos.length === 0) {
        // If first attempt, throw error to trigger automatic retry
        if (job.attemptsMade === 0) {
          throw new Error('COLD_START_RETRY: Empty results on first attempt')
        }
        // After retry, return empty array as final result
        videos = []
      }

      // Cache write should not block job completion
      setVideoToCache(query, platform, videos, dateRange).catch(() => {
        // Silently ignore cache write failures
      })

      try {
        await job.updateProgress(100)
      } catch (err) {
        // Progress update failure is non-critical
      }

      return videos
    } catch (error) {
      throw classifyScrapingError(error, platform)
    }
  },
  {
    connection: redisConnection.connection,
    concurrency: CONCURRENCY,
    limiter: {
      max: RATE_LIMITER_MAX,
      duration: RATE_LIMITER_DURATION,
    },
    // Job processing lock settings
    lockDuration: LOCK_DURATION, // 5 minutes - maximum job processing time
    lockRenewTime: LOCK_RENEW_TIME, // 100 seconds - renew lock every ~1.67 minutes
    maxStalledCount: MAX_STALLED_COUNT, // Maximum number of times a job can be stalled
    stalledInterval: STALLED_INTERVAL, // Check for stalled jobs every 30 seconds
  }
)

export default worker
