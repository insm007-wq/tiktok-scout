import { auth } from '@/lib/auth'
import { updateUserRole } from '@/lib/userLimits'

export async function POST(request: Request) {
  const session = await auth()

  // 관리자 권한 확인
  if (!session || !session.user?.isAdmin) {
    return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  try {
    const { email, isAdmin } = await request.json()

    if (!email || typeof isAdmin !== 'boolean') {
      return Response.json(
        { error: '이메일과 권한을 입력해주세요' },
        { status: 400 }
      )
    }

    const success = await updateUserRole(email, session.user.email, isAdmin)

    if (!success) {
      return Response.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const role = isAdmin ? '관리자' : '일반 사용자'
    return Response.json({
      success: true,
      message: `${email} 사용자의 권한이 ${role}로 변경되었습니다`,
    })
  } catch (error) {
    console.error('❌ [POST /api/admin/users/update-role]', error)
    return Response.json(
      { error: '사용자 권한 변경 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
