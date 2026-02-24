import { NextRequest, NextResponse } from 'next/server'
import { searchQueue } from '@/lib/queue/search-queue'
import { clearSearchCache } from '@/lib/cache'

const APIFY_ABORT_URL = 'https://api.apify.com/v2/actor-runs'

/** 취소 시 Apify 실행도 중단 (RUNNING/READY 상태만 중단 가능) */
async function abortApifyRuns(runIds: string[], apiKey: string): Promise<void> {
  await Promise.all(
    runIds.map((runId) =>
      fetch(`${APIFY_ABORT_URL}/${runId}/abort?token=${apiKey}`, { method: 'POST' })
    )
  )
}

export async function POST(request: NextRequest) {
  try {
    const { jobId, query, platform, dateRange } = await request.json()

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      )
    }

    const job = await searchQueue.getJob(jobId)
    if (job) {
      const data = job.data as { apifyRunId?: string; apifyRunIds?: string[] }
      const runIds = data.apifyRunIds ?? (data.apifyRunId ? [data.apifyRunId] : [])
      const apiKey = process.env.APIFY_API_KEY

      if (runIds.length > 0 && apiKey) {
        try {
          await abortApifyRuns(runIds, apiKey)
          console.log('[CancelAPI] Apify run(s) aborted:', runIds)
        } catch (err) {
          console.warn('[CancelAPI] Apify abort failed (run may already be finished):', err)
        }
      }

      await job.remove()
    }

    // Clear both L1 (memory) and L2 (MongoDB) cache for this search
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
