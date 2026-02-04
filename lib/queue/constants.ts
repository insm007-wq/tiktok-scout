/**
 * Queue configuration constants
 * Centralized settings for video search queue system
 */

/** Queue name for video search jobs */
export const QUEUE_NAME = 'video-search' as const

/** Maximum number of videos to scrape per search */
export const MAX_VIDEOS_PER_SEARCH = 100 as const

/** Default worker concurrency level */
export const DEFAULT_WORKER_CONCURRENCY = 50 as const

/** Job processing timeout (5 minutes in milliseconds) */
export const LOCK_DURATION = 300000 as const

/** Lock renewal interval (100 seconds in milliseconds) */
export const LOCK_RENEW_TIME = 100000 as const

/** Stalled job check interval (30 seconds in milliseconds) */
export const STALLED_INTERVAL = 30000 as const

/** Maximum times a job can be marked as stalled before failure */
export const MAX_STALLED_COUNT = 2 as const

/** Job retry attempts */
export const JOB_ATTEMPTS = 2 as const

/** Initial backoff delay for job retries (milliseconds) */
export const BACKOFF_DELAY = 2000 as const

/** Rate limiter: max requests */
export const RATE_LIMITER_MAX = 100 as const

/** Rate limiter: duration window (milliseconds) */
export const RATE_LIMITER_DURATION = 1000 as const

/** Keep last N completed jobs for debugging */
export const COMPLETED_JOB_RETENTION_COUNT = 20 as const

/** Remove completed jobs older than N seconds (1 hour) */
export const COMPLETED_JOB_RETENTION_AGE = 3600 as const

/** Keep last N failed jobs for analysis */
export const FAILED_JOB_RETENTION_COUNT = 50 as const

/** Remove failed jobs older than N seconds (24 hours) */
export const FAILED_JOB_RETENTION_AGE = 86400 as const

/** Default Redis URL for local development */
export const DEFAULT_REDIS_URL = 'redis://localhost:6379' as const

/** Railway scraping timeout (2 minutes in milliseconds) */
export const RAILWAY_TIMEOUT = 120000 as const
