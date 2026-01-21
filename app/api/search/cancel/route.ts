import { NextRequest, NextResponse } from 'next/server'
import { searchQueue } from '@/lib/queue/search-queue'
import { clearSearchCache } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    const { jobId, query, platform, dateRange } = await request.json()

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      )
    }

    // Remove job from queue if it's still waiting
    const job = await searchQueue.getJob(jobId)
    if (job) {
      await job.remove()
    }

    // Clear both L1 (memory) and L2 (MongoDB) cache for this search
    // This prevents cached results from appearing after cancellation
    if (query && platform) {
      await clearSearchCache(query, platform, dateRange)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CancelAPI] Error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    )
  }
}
