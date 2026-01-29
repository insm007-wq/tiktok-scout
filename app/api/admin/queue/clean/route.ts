import { NextRequest, NextResponse } from 'next/server'
import { Queue } from 'bullmq'
import { auth } from '@/lib/auth'
import { redisConnection } from '@/lib/queue/redis'

/**
 * POST /api/admin/queue/clean
 * 오래된 완료/실패된 작업 정리
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
    const { status, gracePeriod, limit = 1000 } = body

    if (!status || !['completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: "status는 'completed' 또는 'failed'여야 합니다." },
        { status: 400 }
      )
    }

    if (!gracePeriod || typeof gracePeriod !== 'number') {
      return NextResponse.json(
        { error: 'gracePeriod은 숫자여야 합니다 (milliseconds)' },
        { status: 400 }
      )
    }

    // 3. Redis 연결
    const connection = redisConnection.connection
    const queue = new Queue('video-search', { connection: connection as any })

    // 4. 작업 정리
    const cleaned = await queue.clean(gracePeriod, limit, status)

    console.log(
      `✅ Queue cleanup: ${status} jobs - ${cleaned.length} items removed (grace period: ${gracePeriod}ms)`
    )

    // 5. 응답
    return NextResponse.json({
      success: true,
      status,
      cleaned: cleaned.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Queue clean error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
