import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { withdrawUser, getUserById } from '@/lib/userLimits'
import { verifyPassword } from '@/lib/auth/password'

/**
 * POST /api/auth/withdraw
 * 회원 탈퇴 처리
 * 비밀번호 재확인을 통해 본인 인증 후 탈퇴 진행
 */
export async function POST(req: NextRequest) {
  try {
    // 세션 확인
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const email = session.user.email
    const body = await req.json()
    const { password } = body

    // 비밀번호 검증
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: '비밀번호가 필요합니다' },
        { status: 400 }
      )
    }

    // 사용자 조회
    const user = await getUserById(email)

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 비밀번호 검증
    if (!user.password) {
      return NextResponse.json(
        { error: '비밀번호가 설정되지 않은 계정입니다' },
        { status: 400 }
      )
    }

    const isPasswordValid = await verifyPassword(password, user.password)

    if (!isPasswordValid) {
      console.warn('[Withdraw API] 잘못된 비밀번호')
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다' },
        { status: 403 }
      )
    }

    // 회원 탈퇴 처리
    const success = await withdrawUser(email)

    if (!success) {
      return NextResponse.json(
        { error: '회원 탈퇴 처리 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    console.log('✅ [Withdraw API] 회원 탈퇴 성공')

    return NextResponse.json(
      {
        success: true,
        message: '회원 탈퇴가 완료되었습니다. 14일 후 재가입이 가능합니다.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Withdraw API 오류]', error)

    return NextResponse.json(
      { error: '회원 탈퇴 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
