import { auth } from '@/lib/auth'
import { toggleUserActive } from '@/lib/userLimits'

export async function POST(request: Request) {
  const session = await auth()

  // 관리자 권한 확인
  if (!session || !session.user?.isAdmin) {
    return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  try {
    const { email, isActive } = await request.json()

    if (!email || typeof isActive !== 'boolean') {
      return Response.json(
        { error: '이메일과 상태를 입력해주세요' },
        { status: 400 }
      )
    }

    const success = await toggleUserActive(email, session.user.email, isActive)

    if (!success) {
      return Response.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const status = isActive ? '활성화' : '비활성화'
    return Response.json({
      success: true,
      message: `${email} 사용자가 ${status}되었습니다`,
    })
  } catch (error) {
    console.error('❌ [POST /api/admin/users/toggle-active]', error)
    return Response.json(
      { error: '사용자 상태 변경 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
