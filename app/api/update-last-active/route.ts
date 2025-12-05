import { NextRequest, NextResponse } from 'next/server'
import { updateLastActive } from '@/lib/userLimits'

export async function POST(request: NextRequest) {
  let email = ''
  try {
    const body = await request.json()
    email = body.email

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    console.log(`✅ [updateLastActive] 사용자 업데이트: ${email}`)
    await updateLastActive(email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`❌ [updateLastActive] 오류 (${email}):`, error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
