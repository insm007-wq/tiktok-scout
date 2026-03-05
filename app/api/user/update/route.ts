import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserById, updateUserProfile } from '@/lib/userLimits'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

/**
 * POST /api/user/update
 * 사용자 정보 수정 (이름, 전화번호, 비밀번호, 마케팅 동의)
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

    // 사용자 조회
    const user = await getUserById(email)

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 업데이트할 필드 준비
    const updateData: any = {}

    // 이름 변경 (회원가입과 동일: trim, 2~50자, 한글/영문 포함)
    if (body.name !== undefined && body.name !== null) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (name.length < 2 || name.length > 50) {
        return NextResponse.json(
          { error: '이름은 2자 이상 50자 이하여야 합니다' },
          { status: 400 }
        )
      }
      if (!/[가-힣a-zA-Z]/.test(name)) {
        return NextResponse.json(
          { error: '이름에는 한글 또는 영문이 포함되어야 합니다' },
          { status: 400 }
        )
      }
      updateData.name = name
    }

    // 전화번호 변경
    if (body.phone !== undefined && body.phone !== null) {
      if (typeof body.phone !== 'string' || !/^01[0-9][-]?\d{3,4}[-]?\d{4}$/.test(body.phone)) {
        return NextResponse.json(
          { error: '올바른 핸드폰 번호 형식이 아닙니다' },
          { status: 400 }
        )
      }
      updateData.phone = body.phone.replace(/-/g, '')
    }

    // 마케팅 동의 변경
    if (body.marketingConsent !== undefined && body.marketingConsent !== null) {
      updateData.marketingConsent = body.marketingConsent === true
    }

    // 비밀번호 변경
    if (body.currentPassword !== undefined && body.newPassword !== undefined) {
      if (typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string') {
        return NextResponse.json(
          { error: '비밀번호가 올바르지 않습니다' },
          { status: 400 }
        )
      }

      // 현재 비밀번호 검증
      if (!user.password) {
        return NextResponse.json(
          { error: '비밀번호가 설정되지 않은 계정입니다' },
          { status: 400 }
        )
      }

      const isPasswordValid = await verifyPassword(body.currentPassword, user.password)

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: '현재 비밀번호가 일치하지 않습니다' },
          { status: 403 }
        )
      }

      // 새 비밀번호 검증 (회원가입과 동일: 8~50자)
      if (body.newPassword.length < 8 || body.newPassword.length > 50) {
        return NextResponse.json(
          { error: '새 비밀번호는 8자 이상 50자 이하여야 합니다.' },
          { status: 400 }
        )
      }

      // 새 비밀번호 해싱
      const hashedPassword = await hashPassword(body.newPassword)
      updateData.password = hashedPassword
    }

    // 업데이트할 필드가 없으면 오류 반환
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '업데이트할 정보가 없습니다' },
        { status: 400 }
      )
    }

    // 사용자 정보 업데이트
    const updated = await updateUserProfile(email, updateData)

    if (!updated) {
      return NextResponse.json(
        { error: '정보 업데이트 실패' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: '정보가 성공적으로 업데이트되었습니다',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[User Update API 오류]', error)

    return NextResponse.json({ error: '정보 업데이트 중 오류가 발생했습니다' }, { status: 500 })
  }
}
