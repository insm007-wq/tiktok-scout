import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPendingApprovals } from '@/lib/userLimits'

/**
 * GET /api/admin/approvals/pending
 * 승인 대기 중인 사용자 목록 조회 (관리자만)
 */
export async function GET(req: NextRequest) {
  try {
    // 관리자 인증 확인
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: '관리자만 접근 가능합니다.' }, { status: 403 })
    }

    // 승인 대기 사용자 목록 조회
    const pendingUsers = await getPendingApprovals()

    // 비밀번호 필드는 제외
    const safeUsers = pendingUsers.map((user) => {
      const { password, ...safeUser } = user
      return safeUser
    })

    return NextResponse.json({
      success: true,
      count: safeUsers.length,
      users: safeUsers,
    })
  } catch (error) {
    console.error('[Admin Pending Approvals API 오류]', error)
    return NextResponse.json({ error: '요청 처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
