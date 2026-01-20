import { NextRequest, NextResponse } from 'next/server'
import { searchQueue } from '@/lib/queue/search-queue'

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

    // Remove the job from queue
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
