import { auth } from '@/lib/auth'
import { getAllUsers } from '@/lib/userLimits'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  const session = await auth()

  // 관리자 권한 확인
  if (!session || !session.user?.isAdmin) {
    return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const status = (searchParams.get('status') as any) || 'all'
    const role = (searchParams.get('role') as any) || 'all'
    const approved = (searchParams.get('approved') as any) || 'all'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await getAllUsers(
      {
        search,
        status,
        role,
        approved,
      },
      {
        page,
        limit,
      }
    )

    // 비밀번호 필드 제외
    const users = result.users.map((user) => {
      const { ...userWithoutPassword } = user as any
      delete userWithoutPassword.password
      return userWithoutPassword
    })

    return Response.json({
      success: true,
      users,
      total: result.total,
      page,
      limit,
      pages: Math.ceil(result.total / limit),
    })
  } catch (error) {
    console.error('❌ [GET /api/admin/users/list]', error)
    return Response.json(
      { error: '사용자 목록을 가져올 수 없습니다' },
      { status: 500 }
    )
  }
}
