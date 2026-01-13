import { auth } from '@/lib/auth'
import { approveUser } from '@/lib/userLimits'

export async function POST(request: Request) {
  const session = await auth()

  // 관리자 권한 확인
  if (!session || !session.user?.isAdmin) {
    return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return Response.json({ error: '이메일을 입력해주세요' }, { status: 400 })
    }

    const success = await approveUser(email, session.user.email)

    if (!success) {
      return Response.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      message: `${email} 사용자가 승인되었습니다`,
    })
  } catch (error) {
    console.error('❌ [POST /api/admin/users/approve]', error)
    return Response.json(
      { error: '사용자 승인 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
