import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { signupSchema } from '@/lib/validations/auth'
import { createUser, getUserById, getUserByPhone } from '@/lib/userLimits'
import { hashPassword } from '@/lib/auth/password'

// 환경 변수에서 초대 코드 로드
const INVITATION_CODE = process.env.INVITATION_CODE

if (!INVITATION_CODE) {
  console.error('[Signup API] ⚠️ WARNING: INVITATION_CODE not set!')
}

/**
 * POST /api/auth/signup
 * 회원가입
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Zod 검증
    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: '입력값 검증 실패',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const data = parsed.data

    // 초대 코드 확인
    if (!INVITATION_CODE) {
      return NextResponse.json(
        { error: '초대 코드 시스템이 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const submittedCode = data.invitationCode.trim().toUpperCase()
    const validCode = INVITATION_CODE.trim().toUpperCase()

    if (submittedCode !== validCode) {
      console.warn(`[Signup API] Invalid invitation code: ${submittedCode}`)
      return NextResponse.json(
        { error: '유효하지 않은 초대 코드입니다' },
        { status: 403 }
      )
    }

    // 이메일 중복 확인
    const existingEmail = await getUserById(data.email)
    if (existingEmail) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다' }, { status: 409 })
    }

    // 핸드폰 번호 중복 확인
    const existingPhone = await getUserByPhone(data.phone)
    if (existingPhone) {
      return NextResponse.json({ error: '이미 사용 중인 핸드폰 번호입니다' }, { status: 409 })
    }

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(data.password)

    // 사용자 생성 (유효한 초대 코드 입력 시 자동 승인)
    const newUser = await createUser({
      email: data.email,
      name: data.name,
      phone: data.phone.replace(/-/g, ''), // 하이픈 제거
      password: hashedPassword,
      address: `${data.address.zipCode} ${data.address.address} ${data.address.detailAddress}`,
      marketingConsent: data.marketingConsent,
      isApproved: true,
    })

    return NextResponse.json(
      {
        success: true,
        message: '회원가입이 완료되었습니다. 로그인해주세요.',
        email: newUser.email,
        phone: newUser.phone,
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
        { error: '이미 사용 중인 이메일 또는 핸드폰 번호입니다' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: '회원가입 처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
