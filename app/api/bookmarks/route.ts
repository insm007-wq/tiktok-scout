import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const bookmarks = await db
      .collection('bookmarks')
      .find({ email: session.user.email })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ bookmarks })
  } catch (error) {
    console.error('[Bookmarks GET] error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { videoId, platform, videoData } = body

    if (!videoId || !platform || !videoData) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    await db.collection('bookmarks').updateOne(
      { email: session.user.email, videoId, platform },
      {
        $set: {
          email: session.user.email,
          videoId,
          platform,
          videoData,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Bookmarks POST] error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
