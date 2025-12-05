import { NextRequest, NextResponse } from 'next/server'
import { setUserOffline } from '@/lib/userLimits'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    await setUserOffline(email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to set user offline:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
