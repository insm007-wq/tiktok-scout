import { Worker, Job } from 'bullmq'
import { SearchJobData } from './search-queue'
import { redisConnection } from './redis'
import { searchTikTokVideos } from '@/lib/scrapers/tiktok'
import { searchDouyinVideosParallel } from '@/lib/scrapers/douyin'
import { searchXiaohongshuVideosParallel } from '@/lib/scrapers/xiaohongshu'
import { setVideoToMongoDB, setVideoToCache } from '@/lib/cache'

const CONCURRENCY = process.env.WORKER_CONCURRENCY ? parseInt(process.env.WORKER_CONCURRENCY) : 50
const RAILWAY_URL = process.env.RAILWAY_SERVER_URL
const RAILWAY_SECRET = process.env.RAILWAY_API_SECRET
const APIFY_KEY = process.env.APIFY_API_KEY

console.log('[Worker] Configuration:', {
  CONCURRENCY,
  RAILWAY_URL: RAILWAY_URL ? '✅ Set' : '❌ Not set',
  APIFY_KEY: APIFY_KEY ? '✅ Set' : '❌ Not set'
})

/**
 * Railway 서버를 통해 스크래핑 (프로덕션)
 * Fallback: 로컬 scraper 사용 (개발/테스트)
 */
async function scrapeViaRailway(
  query: string,
  platform: 'tiktok' | 'douyin' | 'xiaohongshu',
  dateRange?: string
) {
  if (!RAILWAY_URL || !RAILWAY_SECRET) {
    return null // Fallback to local scraper
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
        limit: 100,
        dateRange,
      }),
      signal: AbortSignal.timeout(120000), // 2분 타임아웃
    })

    const data = await response.json()

    if (response.ok && data.success && Array.isArray(data.videos)) {
      return data.videos
    }
    return null
  } catch (error) {
    console.error('[Worker] Railway scraping failed:', error)
    return null
  }
}

const worker = new Worker<SearchJobData>(
  'video-search',
  async (job) => {
    const { query, platform, dateRange } = job.data

    await job.updateProgress(10)

    let videos

    try {
      // 1️⃣ Railway 서버를 통해 스크래핑 시도 (프로덕션)
      videos = await scrapeViaRailway(query, platform, dateRange)

      // 2️⃣ Fallback: 로컬 scraper 사용 (Railway 실패 시 또는 개발 환경)
      if (!videos || videos.length === 0) {
        if (!APIFY_KEY) {
          throw new Error('Apify API key not configured')
        }

        switch (platform) {
          case 'tiktok':
            videos = await searchTikTokVideos(query, 100, APIFY_KEY, dateRange)
            break
          case 'douyin':
            videos = await searchDouyinVideosParallel(query, 100, APIFY_KEY, dateRange)
            break
          case 'xiaohongshu':
            videos = await searchXiaohongshuVideosParallel(query, 100, APIFY_KEY, dateRange)
            break
          default:
            throw new Error(`Unknown platform: ${platform}`)
        }
      }

      await job.updateProgress(80)

      await setVideoToCache(query, platform, videos, dateRange)

      await job.updateProgress(100)

      return videos
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // 에러 메시지에 구체적인 정보 포함 (예: 429, timeout, 등)
      if (errorMessage.includes('429')) {
        throw new Error(`429_RATE_LIMIT: Apify API rate limit exceeded`)
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
        throw new Error(`NETWORK_ERROR: Connection timeout or refused`)
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        throw new Error(`AUTH_ERROR: Invalid API key or authorization`)
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('DNS')) {
        throw new Error(`DNS_ERROR: Cannot resolve host`)
      } else {
        throw new Error(`APIFY_ERROR: Scraping failed for ${platform}: ${errorMessage}`)
      }
    }
  },
  {
    connection: redisConnection.connection as any,
    concurrency: CONCURRENCY,
    limiter: {
      max: 100,
      duration: 1000
    },
    // Job 처리 중 락 유지 설정
    lockDuration: 300000,      // 5분 (300초) - Job 처리 최대 시간
    lockRenewTime: 150000,     // 2.5분 (150초) - 락 갱신 주기
    maxStalledCount: 2,        // 최대 stalled 재시도 횟수
    stalledInterval: 5000,     // 5초마다 stalled 상태 체크
  }
)

worker.on('ready', () => {
  console.log('[Worker] ✅ Worker ready and connected to Redis')
})

worker.on('error', (err) => {
  console.error('[Worker] ❌ Worker error:', err.message)
})

worker.on('completed', (job) => {
  if (job) console.log(`[Worker] ✅ Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  if (job) console.error(`[Worker] ❌ Job ${job.id} failed:`, err.message)
})

worker.on('progress', (job, progress) => {
  if (job) console.log(`[Worker] 📊 Job ${job.id} progress: ${progress}%`)
})

worker.on('active', (job) => {
  if (job) console.log(`[Worker] ▶️ Job ${job.id} started processing`)
})

// Worker 시작 로그
console.log('[Worker] 🚀 Worker started and listening for jobs...')
console.log('[Worker] Waiting for jobs in Redis queue...')

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] 🛑 SIGTERM received, closing worker...')
  await worker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[Worker] 🛑 SIGINT received, closing worker...')
  await worker.close()
  process.exit(0)
})

export default worker
