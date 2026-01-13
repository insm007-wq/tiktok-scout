import { auth } from '@/lib/auth'
import { banUser } from '@/lib/userLimits'

export async function POST(request: Request) {
  const session = await auth()

  // 관리자 권한 확인
  if (!session || !session.user?.isAdmin) {
    return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  try {
    const { email, reason } = await request.json()

    if (!email) {
      return Response.json({ error: '이메일을 입력해주세요' }, { status: 400 })
    }

    const success = await banUser(email, session.user.email, reason)

    if (!success) {
      return Response.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      message: `${email} 사용자가 차단되었습니다`,
    })
  } catch (error) {
    console.error('❌ [POST /api/admin/users/ban]', error)
    return Response.json(
      { error: '사용자 차단 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
