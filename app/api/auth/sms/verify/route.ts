import { NextRequest, NextResponse } from 'next/server'
import { verifySMSCode } from '@/lib/auth/sms'
import { markUserAsVerified, getUserByPhone } from '@/lib/userLimits'

/**
 * POST /api/auth/sms/verify
 * SMS 인증 코드 검증
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, code } = body

    // 입력값 검증
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: '핸드폰 번호를 입력해주세요' }, { status: 400 })
    }

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: '올바른 인증 코드를 입력해주세요' }, { status: 400 })
    }

    // SMS 코드 검증
    const isValid = verifySMSCode(phone, code)

    if (!isValid) {
      return NextResponse.json(
        { error: '인증 코드가 일치하지 않거나 만료되었습니다' },
        { status: 400 }
      )
    }

    // 사용자 존재 여부 확인
    const user = await getUserByPhone(phone)

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // 사용자를 인증 완료 상태로 업데이트
    const marked = await markUserAsVerified(user.email)

    if (!marked) {
      return NextResponse.json({ error: '인증 처리 중 오류가 발생했습니다' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'SMS 인증이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.',
      email: user.email,
    })
  } catch (error) {
    console.error('[SMS Verify API 오류]', error)
    return NextResponse.json({ error: '요청 처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
