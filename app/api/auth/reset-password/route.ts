import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { hashPassword } from '@/lib/auth/password'

/**
 * POST /api/auth/reset-password
 * 인증 코드 검증 후 비밀번호 재설정
 */
export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json()

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: '이메일, 인증 코드, 새 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      )
    }

    const trimmedEmail = (email as string).trim().toLowerCase()
    const codeStr = String(code).trim()

    if (newPassword.length < 8 || newPassword.length > 50) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상 50자 이하여야 합니다.' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()

    const record = await db.collection('password_reset_codes').findOne({
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

    await db.collection('password_reset_codes').deleteOne({ _id: record._id })

    const hashedPassword = await hashPassword(newPassword)
    const result = await db.collection('users').findOneAndUpdate(
      { email: trimmedEmail },
      { $set: { password: hashedPassword, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: '비밀번호가 재설정되었습니다. 로그인해주세요.' })
  } catch (error) {
    console.error('[reset-password] error:', error)
    return NextResponse.json(
      { error: '비밀번호 재설정에 실패했습니다.' },
      { status: 500 }
    )
  }
}
