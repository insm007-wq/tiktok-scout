import { NextRequest, NextResponse } from 'next/server'
import { Queue } from 'bullmq'
import { auth } from '@/lib/auth'
import { redisConnection } from '@/lib/queue/redis'

/**
 * POST /api/admin/queue/drain
 * 대기 중인 모든 작업 제거 (진행 중인 작업 제외)
 * ⚠️ 매우 파괴적인 작업입니다
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const session = await auth()
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: '관리자만 접근 가능합니다.' },
        { status: 403 }
      )
    }

    // 2. 요청 파싱
    const body = await request.json()
    const { delayed = false } = body

    // 3. Redis 연결
    const connection = redisConnection.connection
    const queue = new Queue('video-search', { connection: connection as any })

    // 4. 대기 중인 작업 제거
    // drain(delayed): delayed가 true면 delayed 작업도 함께 제거
    const drained = await queue.drain(delayed)

    console.log(
      `⚠️ Queue drain: ${drained} waiting jobs removed (delayed=${delayed})`
    )

    // 5. 응답
    return NextResponse.json({
      success: true,
      drained,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Queue drain error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
