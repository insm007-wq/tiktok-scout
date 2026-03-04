import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import crypto from 'crypto'

/**
 * POST /api/auth/verify-email-code
 * 6자리 인증 코드 검증 → 일회용 토큰 발급 (회원가입 시 사용)
 */
export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: '이메일과 인증 코드를 입력해주세요.' }, { status: 400 })
    }

    const trimmedEmail = (email as string).trim().toLowerCase()
    const codeStr = String(code).trim()

    const { db } = await connectToDatabase()

    const record = await db.collection('email_verification_codes').findOne({
      email: trimmedEmail,
      code: codeStr,
      expiresAt: { $gt: new Date() },
    })

    if (!record) {
      return NextResponse.json(
        { error: '인증 코드가 올바르지 않거나 만료되었습니다.' },
        { status: 400 }
      )
    }

    await db.collection('email_verification_codes').deleteOne({ _id: record._id })

    const token = crypto.randomBytes(32).toString('hex')
    await db.collection('email_verified_tokens').insertOne({
      token,
      email: trimmedEmail,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10분
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true, emailVerificationToken: token })
  } catch (error) {
    console.error('[verify-email-code] error:', error)
    return NextResponse.json(
      { error: '인증에 실패했습니다.' },
      { status: 500 }
    )
  }
}
