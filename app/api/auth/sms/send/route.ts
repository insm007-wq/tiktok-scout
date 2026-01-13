import { NextRequest, NextResponse } from 'next/server'
import { sendSMSVerification } from '@/lib/auth/sms'

/**
 * POST /api/auth/sms/send
 * SMS 인증 코드 발송
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone } = body

    // 입력값 검증
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: '핸드폰 번호를 입력해주세요' }, { status: 400 })
    }

    // SMS 발송
    const result = await sendSMSVerification(phone)

    if (!result.success) {
      return NextResponse.json({ error: result.error || '문자 발송 실패' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: '인증 코드가 발송되었습니다. (5분 유효)',
    })
  } catch (error) {
    console.error('[SMS Send API 오류]', error)
    return NextResponse.json({ error: '요청 처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
