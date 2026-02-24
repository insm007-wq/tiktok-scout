import { NextRequest, NextResponse } from 'next/server'
import { searchQueue } from '@/lib/queue/search-queue'

const APIFY_ABORT_URL = 'https://api.apify.com/v2/actor-runs'

async function abortApifyRuns(runIds: string[], apiKey: string): Promise<void> {
  await Promise.all(
    runIds.map((runId) =>
      fetch(`${APIFY_ABORT_URL}/${runId}/abort?token=${apiKey}`, { method: 'POST' })
    )
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const job = await searchQueue.getJob(jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const data = job.data as { apifyRunId?: string; apifyRunIds?: string[] }
    const runIds = data.apifyRunIds ?? (data.apifyRunId ? [data.apifyRunId] : [])
    const apiKey = process.env.APIFY_API_KEY
    if (runIds.length > 0 && apiKey) {
      try {
        await abortApifyRuns(runIds, apiKey)
      } catch {
        // ignore
      }
    }

    await job.remove()

    return NextResponse.json({
      status: 'cancelled',
      jobId,
      message: 'Job cancelled successfully'
    })
  } catch (error) {
    console.error('[CancelAPI] Error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    )
  }
}
