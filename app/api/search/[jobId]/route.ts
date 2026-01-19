import { NextRequest, NextResponse } from 'next/server'
import { searchQueue } from '@/lib/queue/search-queue'

export async function GET(
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

    const state = await job.getState()
    const progressValue = typeof job.progress === 'number' ? job.progress : 0
    const data = job.data
    const waitingCount = await searchQueue.getWaitingCount()

    // 완료된 경우
    if (state === 'completed') {
      const result = job.returnvalue
      return NextResponse.json({
        status: 'completed',
        jobId,
        progress: 100,
        data: result,
        timestamp: Date.now()
      })
    }

    // 실패한 경우
    if (state === 'failed') {
      const failedReason = job.failedReason || 'Unknown error'
      return NextResponse.json({
        status: 'failed',
        jobId,
        error: failedReason,
        progress: 0,
        timestamp: Date.now()
      }, { status: 500 })
    }

    // 처리 중 또는 대기 중
    const message = state === 'active'
      ? `데이터 수집 중... (${progressValue}%)`
      : `대기 중... (앞에 ${Math.max(0, waitingCount)} 작업 대기)`

    return NextResponse.json({
      status: state, // 'waiting' | 'active' | 'delayed' | 'paused'
      jobId,
      progress: Math.round(progressValue),
      message,
      queuePosition: waitingCount + 1,
      query: data?.query,
      platform: data?.platform,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('[StatusAPI] Error:', error)
    return NextResponse.json(
      { error: '상태 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
