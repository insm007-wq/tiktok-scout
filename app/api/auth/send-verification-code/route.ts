import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getUserById } from '@/lib/userLimits'
import { sendVerificationCodeEmail } from '@/lib/email'

/**
 * POST /api/auth/send-verification-code
 * 6자리 인증 코드 발송 (회원가입 폼용)
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

    const existing = await getUserById(trimmedEmail)
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 })
    }

    const { db } = await connectToDatabase()

    // 1분 내 재발송 방지
    const recent = await db.collection('email_verification_codes').findOne({
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

    await db.collection('email_verification_codes').deleteMany({ email: trimmedEmail })
    await db.collection('email_verification_codes').insertOne({
      email: trimmedEmail,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5분
      createdAt: new Date(),
    })

    await sendVerificationCodeEmail(trimmedEmail, code)

    return NextResponse.json({ success: true, message: '인증 코드를 발송했습니다.' })
  } catch (error) {
    console.error('[send-verification-code] error:', error)
    return NextResponse.json(
      { error: '인증 코드 발송에 실패했습니다.' },
      { status: 500 }
    )
  }
}
