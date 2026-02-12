import { Worker } from 'bullmq'
import { SearchJobData } from './search-queue'
import { redisConnection } from './redis'
import { searchTikTokVideos } from '@/lib/scrapers/tiktok'
import { searchDouyinVideosParallel } from '@/lib/scrapers/douyin'
import { searchYouTubeVideos } from '@/lib/scrapers/youtube'
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
} from './constants'

const CONCURRENCY = process.env.WORKER_CONCURRENCY ? parseInt(process.env.WORKER_CONCURRENCY) : DEFAULT_WORKER_CONCURRENCY
const APIFY_KEY = process.env.APIFY_API_KEY

// ✅ IMPROVED: 시작 시 필수 환경 변수 검증
if (!APIFY_KEY) {
  console.error('❌ FATAL: APIFY_API_KEY environment variable is not set')
  process.exit(1)
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
    const { query, platform: rawPlatform, dateRange } = job.data
    const platform = typeof rawPlatform === 'string' ? rawPlatform.toLowerCase() : rawPlatform

    try {
      await job.updateProgress(10)
    } catch (err) {
      // Progress update failure is non-critical, continue processing
    }

    let videos: any[] = []

    try {
      // Use local scrapers (via Apify API)
      if (!APIFY_KEY) {
        throw new Error('APIFY_KEY environment variable not configured')
      }

      console.log(`[Worker] 🔄 스크래핑 시작`, {
        jobId: job.id,
        query: query.substring(0, 30),
        platform,
        dateRange: dateRange || 'all',
        attempts: job.attemptsMade,
        timestamp: new Date().toISOString()
      })

      switch (platform) {
        case 'tiktok':
          videos = await searchTikTokVideos(query, MAX_VIDEOS_PER_SEARCH, APIFY_KEY, dateRange)
          break
        case 'douyin':
          videos = await searchDouyinVideosParallel(query, MAX_VIDEOS_PER_SEARCH, APIFY_KEY, dateRange)
          break
        case 'youtube':
          videos = await searchYouTubeVideos(query, MAX_VIDEOS_PER_SEARCH, APIFY_KEY, dateRange)
          break
        default:
          throw new Error(`Unknown platform: ${platform}`)
      }

      console.log(`[Worker] ✅ 스크래핑 완료`, {
        jobId: job.id,
        query: query.substring(0, 30),
        platform,
        videoCount: videos.length,
        timestamp: new Date().toISOString()
      })

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
      setVideoToCache(query, platform, videos, dateRange).catch((err) => {
        console.error(`[Worker] ❌ 캐시 작성 실패`, {
          jobId: job.id,
          query: query.substring(0, 30),
          platform,
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString()
        })
      })

      try {
        await job.updateProgress(100)
      } catch (err) {
        // Progress update failure is non-critical
      }

      console.log(`[Worker] 🎉 작업 완료 및 캐시 저장`, {
        jobId: job.id,
        query: query.substring(0, 30),
        platform,
        videoCount: videos.length,
        timestamp: new Date().toISOString()
      })

      return videos
    } catch (error) {
      const classifiedError = classifyScrapingError(error, platform)
      console.error(`[Worker] ❌ 스크래핑 실패`, {
        jobId: job.id,
        query: query.substring(0, 30),
        platform,
        error: classifiedError.message,
        attempts: job.attemptsMade,
        timestamp: new Date().toISOString()
      })
      throw classifiedError
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
