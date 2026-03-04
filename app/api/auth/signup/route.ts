import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { signupSchema } from '@/lib/validations/auth'
import { createUser, getUserById, checkWithdrawnStatus } from '@/lib/userLimits'
import { hashPassword } from '@/lib/auth/password'
import { connectToDatabase } from '@/lib/mongodb'
import crypto from 'crypto'

/**
 * POST /api/auth/signup
 * 회원가입 (폼 인증 완료 시 emailVerificationToken 필수)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력값 검증 실패', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data
    const emailVerificationToken = body.emailVerificationToken as string | undefined

    if (!emailVerificationToken) {
      return NextResponse.json(
        { error: '이메일 인증을 먼저 완료해주세요.' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    const verified = await db.collection('email_verified_tokens').findOne({
      token: emailVerificationToken,
      email: data.email.trim().toLowerCase(),
      expiresAt: { $gt: new Date() },
    })
    if (!verified) {
      return NextResponse.json(
        { error: '이메일 인증이 만료되었습니다. 인증을 다시 진행해주세요.' },
        { status: 400 }
      )
    }

    // 이메일 중복 확인 및 탈퇴 상태 확인
    const existingEmail = await getUserById(data.email)
    if (existingEmail) {
      // 탈퇴한 계정 재가입 가능 여부 확인
      const withdrawnStatus = await checkWithdrawnStatus(data.email)

      if (withdrawnStatus === 'withdrawn') {
        // 탈퇴 후 2주 미경과 - 재가입 불가
        const expiresAt = existingEmail.withdrawalExpiresAt
        const daysRemaining = expiresAt
          ? Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 14
        const availableDate = expiresAt?.toISOString().split('T')[0]

        return NextResponse.json(
          {
            error: `탈퇴 후 ${daysRemaining}일이 남았습니다. ${availableDate} 이후 재가입이 가능합니다.`,
          },
          { status: 403 }
        )
      }

      if (withdrawnStatus === 'expired') {
        // 탈퇴 후 2주 경과 - 기존 계정 삭제 후 신규 가입
        const { db } = await connectToDatabase()
        const collection = db.collection('users')
        await collection.deleteOne({ email: data.email })
        console.log('✅ [Signup] 만료된 탈퇴 계정 삭제됨')
      } else {
        // 탈퇴하지 않은 활성 계정
        return NextResponse.json({ error: '이미 사용 중인 이메일입니다' }, { status: 409 })
      }
    }

    const hashedPassword = await hashPassword(data.password)

    await createUser({
      email: data.email.trim().toLowerCase(),
      name: data.name,
      phone: data.phone.replace(/-/g, ''),
      password: hashedPassword,
      marketingConsent: data.marketingConsent ?? false,
      isApproved: true,
      isVerified: true,
    })

    await db.collection('email_verified_tokens').deleteOne({ token: emailVerificationToken })

    // 자동 로그인용 1회성 토큰
    const loginToken = crypto.randomBytes(32).toString('hex')
    await db.collection('one_time_logins').insertOne({
      token: loginToken,
      email: data.email.trim().toLowerCase(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
    })

    console.log(`[Signup] ✓ 회원가입 완료: ${data.email}`)

    return NextResponse.json(
      {
        success: true,
        message: '회원가입이 완료되었습니다.',
        email: data.email,
        loginToken, // 자동 로그인용
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: '입력값 검증 실패',
          details: error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    console.error('[Signup API 오류]', error)

    // MongoDB 중복 키 에러 처리
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: '회원가입 처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
