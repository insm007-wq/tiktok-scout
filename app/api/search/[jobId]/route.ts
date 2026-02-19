import { NextRequest, NextResponse } from 'next/server'
import { searchQueue } from '@/lib/queue/search-queue'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const params = await context.params
    const jobId = typeof params?.jobId === 'string' ? params.jobId : Array.isArray(params?.jobId) ? params.jobId[0] : undefined
    if (!jobId || !String(jobId).trim()) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const job = await searchQueue.getJob(String(jobId).trim())

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
      try {
        // 직렬화 가능한지 먼저 검사 (circular ref 등 방지)
        const payload = {
          status: 'completed' as const,
          jobId,
          progress: 100,
          data: result,
          timestamp: Date.now()
        }
        JSON.stringify(payload)
        return NextResponse.json(payload)
      } catch (serializeError) {
        const msg = serializeError instanceof Error ? serializeError.message : String(serializeError)
        console.error('[StatusAPI] Completed result serialize error:', msg)
        return NextResponse.json(
          {
            error: '결과를 반환하는 중 오류가 발생했습니다.',
            ...(process.env.NODE_ENV === 'development' && { detail: msg })
          },
          { status: 500 }
        )
      }
    }

    // 실패한 경우
    if (state === 'failed') {
      const failedReason = job.failedReason || 'Unknown error'

      // 에러 메시지 분석 및 사용자 친화적인 메시지 생성
      let userMessage = '잠시 후 다시 시도해주세요.'
      let errorType = 'UNKNOWN_ERROR'

      if (failedReason.includes('429_RATE_LIMIT')) {
        userMessage = '🔄 검색 서버가 과부하 상태입니다.\n\n30초 후 다시 시도해주세요.'
        errorType = 'RATE_LIMIT'
      } else if (failedReason.includes('NETWORK_ERROR')) {
        userMessage = '📡 서버에 연결할 수 없습니다.\n\n네트워크를 확인하고 다시 시도해주세요.'
        errorType = 'NETWORK_ERROR'
      } else if (failedReason.includes('AUTH_ERROR')) {
        userMessage = '🔐 API 인증에 실패했습니다.\n\n관리자에게 문의해주세요.'
        errorType = 'AUTH_ERROR'
      } else if (failedReason.includes('DNS_ERROR')) {
        userMessage = '🌐 인터넷 연결을 확인해주세요.\n\nDNS 해석에 실패했습니다.'
        errorType = 'DNS_ERROR'
      } else if (failedReason.includes('APIFY_ERROR')) {
        userMessage = '⚙️ Apify 스크래핑 서비스에 일시적 문제가 있습니다.\n\n몇 분 후 다시 시도해주세요.'
        errorType = 'APIFY_ERROR'
      } else if (failedReason.includes('empty') || failedReason.includes('no results')) {
        userMessage = '🔍 검색 결과를 찾을 수 없습니다.\n\n다른 키워드로 시도해주세요.'
        errorType = 'NO_RESULTS'
      }

      return NextResponse.json({
        status: 'failed',
        jobId,
        error: userMessage,
        errorType,
        rawError: process.env.NODE_ENV === 'development' ? failedReason : undefined,
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
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('[StatusAPI] Error:', message, stack)
    return NextResponse.json(
      {
        error: '상태 조회 중 오류가 발생했습니다.',
        ...(process.env.NODE_ENV === 'development' && { detail: message }),
      },
      { status: 500 }
    )
  }
}
