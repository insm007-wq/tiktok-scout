import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb } from '@/lib/mongodb'

// 초기화 대상 컬렉션 목록
const COLLECTIONS = [
  'users',
  'api_usage',
  'video_cache',
  'bookmarks',
  'payment_orders',
  'subscriptions',
  'email_verification_codes',
  'email_verified_tokens',
  'password_reset_codes',
  'one_time_logins',
] as const

export async function POST(_req: NextRequest) {
  const session = await auth()

  if (!session?.user?.email || !session.user.isAdmin) {
    return NextResponse.json(
      { error: '관리자 권한이 필요합니다.' },
      { status: 403 }
    )
  }

  const db = await getDb()
  const results: Record<string, { deletedCount: number; error?: string }> = {}

  for (const name of COLLECTIONS) {
    try {
      const res = await db.collection(name).deleteMany({})
      results[name] = { deletedCount: res.deletedCount ?? 0 }
    } catch (error) {
      results[name] = {
        deletedCount: 0,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      message: '모든 주요 컬렉션 데이터가 초기화되었습니다.',
      results,
    },
    { status: 200 }
  )
}

