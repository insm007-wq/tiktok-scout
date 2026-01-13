import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rejectUser } from '@/lib/userLimits'
import { ObjectId } from 'mongodb'

/**
 * POST /api/admin/approvals/reject
 * 사용자 거절 (관리자만)
 */
export async function POST(req: NextRequest) {
  try {
    // 관리자 인증 확인
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: '관리자만 접근 가능합니다.' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, reason } = body

    // 입력값 검증
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 })
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: '거절 사유가 필요합니다.' }, { status: 400 })
    }

    // ObjectId 검증
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: '올바른 사용자 ID 형식이 아닙니다.' }, { status: 400 })
    }

    // 사용자 거절
    const success = await rejectUser(
      new ObjectId(userId),
      new ObjectId(session.user.id),
      reason.trim()
    )

    if (!success) {
      return NextResponse.json({ error: '사용자 거절에 실패했습니다.' }, { status: 404 })
    }

    console.log(`[Admin] 사용자 거절: ${userId} (사유: ${reason}) (관리자: ${session.user.email})`)

    return NextResponse.json({
      success: true,
      message: '사용자를 거절했습니다.',
      userId,
    })
  } catch (error) {
    console.error('[Admin Reject API 오류]', error)
    return NextResponse.json({ error: '요청 처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
