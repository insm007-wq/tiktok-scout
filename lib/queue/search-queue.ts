import { Queue } from 'bullmq'
import { redisConnection } from './redis'

export interface SearchJobData {
  query: string
  platform: 'tiktok' | 'douyin' | 'xiaohongshu'
  dateRange?: string
  userId?: string
}

export const searchQueue = new Queue<SearchJobData>('video-search', {
  connection: redisConnection.connection as any,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  }
})

// Event listeners are handled in the worker
