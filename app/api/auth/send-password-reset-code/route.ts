import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getUserById } from '@/lib/userLimits'
import { sendPasswordResetCodeEmail } from '@/lib/email'

/**
 * POST /api/auth/send-password-reset-code
 * 비밀번호 재설정용 6자리 인증 코드 발송
 * - 가입된 이메일만 가능 (보안: 미가입 이메일은 알리지 않음)
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '이메일을 입력해주세요.' }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 })
    }

    // 가입된 사용자만 코드 발송 (보안: 미가입 시에도 동일 응답)
    const user = await getUserById(trimmedEmail)
    if (!user) {
      return NextResponse.json({ success: true, message: '등록된 이메일로 인증 코드를 발송했습니다.' })
    }

    // credentials 프로바이더로 가입한 사용자만 (비밀번호 있음)
    if (!user.password) {
      return NextResponse.json({ success: true, message: '등록된 이메일로 인증 코드를 발송했습니다.' })
    }

    const { db } = await connectToDatabase()

    // 1분 내 재발송 방지
    const recent = await db.collection('password_reset_codes').findOne({
      email: trimmedEmail,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    })
    if (recent) {
      return NextResponse.json(
        { error: '잠시 후 다시 시도해주세요. (1분 후)' },
        { status: 429 }
      )
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()

    await db.collection('password_reset_codes').deleteMany({ email: trimmedEmail })
    await db.collection('password_reset_codes').insertOne({
      email: trimmedEmail,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5분
      createdAt: new Date(),
    })

    await sendPasswordResetCodeEmail(trimmedEmail, code)

    return NextResponse.json({ success: true, message: '인증 코드를 발송했습니다. 이메일을 확인해주세요.' })
  } catch (error) {
    console.error('[send-password-reset-code] error:', error)
    return NextResponse.json(
      { error: '인증 코드 발송에 실패했습니다.' },
      { status: 500 }
    )
  }
}
