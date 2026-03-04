import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const videoId = id
    const platform = request.nextUrl.searchParams.get('platform')

    if (!videoId || !platform) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const result = await db.collection('bookmarks').deleteMany({
      email: session.user.email,
      videoId,
      platform,
    })

    return NextResponse.json({ success: true, deletedCount: result.deletedCount })
  } catch (error) {
    console.error('[Bookmarks DELETE] error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
