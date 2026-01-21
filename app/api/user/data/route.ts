import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserById } from '@/lib/userLimits'

/**
 * GET /api/user/data
 * 인증된 사용자의 개인정보 반환
 * GDPR 준수: 사용자가 자신의 모든 정보를 조회할 권리
 */
export async function GET(req: NextRequest) {
  try {
    // 세션 확인
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const email = session.user.email

    // 사용자 조회
    const user = await getUserById(email)

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // 반환할 데이터 구성 (민감한 정보 제외)
    const userData = {
      _id: user._id?.toString(),
      email: user.email,
      name: user.name || null,
      phone: user.phone || null,
      address: (user as any).address || null,
      marketingConsent: (user as any).marketingConsent || false,
      wantsTextbook: (user as any).wantsTextbook || false,
      isActive: user.isActive,
      isBanned: user.isBanned,
      isApproved: user.isApproved,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }

    return NextResponse.json(
      {
        success: true,
        data: userData,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[User Data API 오류]', error)

    return NextResponse.json(
      { error: '데이터 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
