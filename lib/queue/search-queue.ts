import { Queue } from 'bullmq'
import { redisConnection } from './redis'
import {
  QUEUE_NAME,
  JOB_ATTEMPTS,
  BACKOFF_DELAY,
  COMPLETED_JOB_RETENTION_COUNT,
  COMPLETED_JOB_RETENTION_AGE,
  FAILED_JOB_RETENTION_COUNT,
  FAILED_JOB_RETENTION_AGE,
} from './constants'

/**
 * Job data structure for video search queue
 */
export interface SearchJobData {
  query: string
  platform: 'tiktok' | 'douyin' | 'xiaohongshu'
  dateRange?: string
  isRecrawl?: boolean  // Flag indicating this is a recrawl due to CDN URL expiration
  isAutoRefresh?: boolean  // Flag indicating this is an auto-refresh from cron job
}

/**
 * Video search queue instance
 * Handles async video scraping jobs with retry logic and automatic cleanup
 */
export const searchQueue = new Queue<SearchJobData>(QUEUE_NAME, {
  connection: redisConnection.connection,
  defaultJobOptions: {
    // Job retention settings for debugging and monitoring
    removeOnComplete: {
      count: COMPLETED_JOB_RETENTION_COUNT, // Keep last 20 completed jobs
      age: COMPLETED_JOB_RETENTION_AGE, // Remove completed jobs older than 1 hour
    },
    removeOnFail: {
      count: FAILED_JOB_RETENTION_COUNT, // Keep last 50 failed jobs for analysis
      age: FAILED_JOB_RETENTION_AGE, // Remove failed jobs older than 24 hours
    },
    // Retry configuration
    attempts: JOB_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: BACKOFF_DELAY, // Initial retry delay: 2 seconds (faster recovery)
    },
  },
})
