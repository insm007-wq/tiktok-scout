import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getVideoFromCache, getVideoFromMongoDB } from '@/lib/cache'
import { searchQueue } from '@/lib/queue/search-queue'
import { Platform } from '@/types/video'
import { checkApiUsage, incrementApiUsage } from '@/lib/apiUsage'

interface SearchRequest {
  query: string
  platform: Platform
  dateRange?: string
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 승인 상태 확인
    if (!session.user.isApproved) {
      return NextResponse.json(
        { error: '관리자 승인이 필요합니다.' },
        { status: 403 }
      )
    }

    // 할당량 체크 (관리자는 무제한)
    if (!session.user.isAdmin) {
      const usageCheck = await checkApiUsage(session.user.email)

      if (!usageCheck.allowed) {
        return NextResponse.json({
          error: '일일 검색 한도를 초과했습니다.',
          details: {
            used: usageCheck.used,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            resetTime: usageCheck.resetTime
          }
        }, { status: 429 })
      }
    }

    const body: SearchRequest = await request.json()
    const { query, platform, dateRange } = body

    // 입력 유효성 검사
    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: '검색어를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 할당량 차감 (캐시 히트 여부와 상관없이)
    if (!session.user.isAdmin) {
      await incrementApiUsage(session.user.email, query.trim())
    }

    // 캐시 확인 (L1 메모리)
    const cacheKey = `video:${platform}:${query}:${dateRange || 'all'}`
    let cached = await getVideoFromCache(query, platform, dateRange)

    if (cached) {
      return NextResponse.json({
        status: 'completed',
        data: cached.videos,
        cached: true,
        timestamp: Date.now()
      })
    }

    // 캐시 미스 → 큐에 작업 추가
    const job = await searchQueue.add('search', {
      query: query.trim(),
      platform,
      dateRange,
    })

    // 큐 길이 기반 예상 대기시간 계산
    const queueLength = await searchQueue.getWaitingCount()
    const estimatedWaitSeconds = Math.max(15, queueLength * 2)

    return NextResponse.json({
      status: 'queued',
      jobId: job.id,
      message: '검색 작업이 대기열에 추가되었습니다',
      estimatedWaitSeconds,
      queuePosition: queueLength + 1,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('[SearchAPI] Error:', error)
    return NextResponse.json(
      { error: '검색 요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
