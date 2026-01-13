import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { Users, CheckCircle2, Clock, Settings } from 'lucide-react'

export const metadata = {
  title: '관리자 대시보드 | TikTok Scout',
  description: '사용자 승인 및 관리',
}

export default async function AdminPage() {
  // 관리자만 접근 가능
  const session = await auth()

  if (!session || !session.user.isAdmin) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
              <p className="text-gray-600 mt-1">사용자 승인 및 계정 관리</p>
            </div>
            <div className="text-sm text-gray-600">
              <p>관리자: <span className="font-semibold">{session.user.email}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 메뉴 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 승인 대기 */}
          <Link href="/admin/approvals">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-100 rounded-full p-3">
                  <Clock size={32} className="text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">승인 대기</h3>
                  <p className="text-sm text-gray-600">신규 사용자 검토 및 승인</p>
                </div>
              </div>
            </div>
          </Link>

          {/* 사용자 관리 (미구현) */}
          <Link href="#" onClick={(e) => e.preventDefault()}>
            <div className="bg-white rounded-lg shadow-md p-6 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 rounded-full p-3">
                  <Users size={32} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">사용자 관리</h3>
                  <p className="text-sm text-gray-600">모든 사용자 보기 및 관리</p>
                  <p className="text-xs text-gray-500 mt-1">준비 중</p>
                </div>
              </div>
            </div>
          </Link>

          {/* 설정 (미구현) */}
          <Link href="#" onClick={(e) => e.preventDefault()}>
            <div className="bg-white rounded-lg shadow-md p-6 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-4">
                <div className="bg-gray-100 rounded-full p-3">
                  <Settings size={32} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">설정</h3>
                  <p className="text-sm text-gray-600">시스템 설정 및 구성</p>
                  <p className="text-xs text-gray-500 mt-1">준비 중</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* 통계 섹션 (미구현) */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">통계</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">총 사용자</p>
              <p className="text-3xl font-bold text-gray-900">-</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">승인 대기</p>
              <p className="text-3xl font-bold text-gray-900">-</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">승인됨</p>
              <p className="text-3xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>

        {/* 최근 활동 (미구현) */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">최근 활동</h2>
          <div className="text-center text-gray-600 py-8">
            <p>최근 활동이 없습니다</p>
          </div>
        </div>
      </div>
    </div>
  )
}
