'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, XCircle, Loader2, ArrowLeft, Mail, Phone, MapPin, Calendar } from 'lucide-react'

interface PendingUser {
  _id: string
  name: string
  email: string
  phone: string
  address?: {
    zipCode: string
    address: string
    detailAddress: string
  }
  marketingConsent: boolean
  createdAt: string
}

export default function ApprovalsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [processingId, setProcessingId] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  // 관리자 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  // 승인 대기 사용자 목록 로드
  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/approvals/pending')

        if (!response.ok) {
          throw new Error('승인 대기 사용자 목록을 가져올 수 없습니다')
        }

        const data = await response.json()
        setUsers(data.users || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.isAdmin) {
      fetchPendingUsers()
    }
  }, [session])

  // 사용자 승인
  const handleApprove = async (userId: string) => {
    setProcessingId(userId)

    try {
      const response = await fetch('/api/admin/approvals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error('승인 처리 중 오류가 발생했습니다')
      }

      // UI에서 제거
      setUsers(users.filter((u) => u._id !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '승인 처리 중 오류가 발생했습니다')
    } finally {
      setProcessingId('')
    }
  }

  // 사용자 거절
  const handleReject = async () => {
    if (!selectedUser || !rejectReason.trim()) {
      setError('거절 사유를 입력해주세요')
      return
    }

    setProcessingId(selectedUser._id)

    try {
      const response = await fetch('/api/admin/approvals/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser._id, reason: rejectReason }),
      })

      if (!response.ok) {
        throw new Error('거절 처리 중 오류가 발생했습니다')
      }

      // UI에서 제거
      setUsers(users.filter((u) => u._id !== selectedUser._id))
      setShowRejectDialog(false)
      setRejectReason('')
      setSelectedUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '거절 처리 중 오류가 발생했습니다')
    } finally {
      setProcessingId('')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">로드 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin" className="text-blue-600 hover:text-blue-700">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">사용자 승인 관리</h1>
              <p className="text-gray-600 mt-1">
                {users.length > 0 ? `${users.length}명의 사용자가 승인 대기 중입니다` : '승인 대기 중인 사용자가 없습니다'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* 사용자 목록 */}
        {users.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <CheckCircle2 size={48} className="text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">모두 승인됨</h3>
            <p className="text-gray-600">승인 대기 중인 사용자가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 왼쪽: 사용자 정보 */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-500">ID: {user._id}</p>
                    </div>

                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail size={16} className="text-gray-500" />
                      <span className="text-sm">{user.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone size={16} className="text-gray-500" />
                      <span className="text-sm">{user.phone}</span>
                    </div>

                    {user.address && (
                      <div className="flex items-start gap-2 text-gray-700">
                        <MapPin size={16} className="text-gray-500 mt-0.5" />
                        <div className="text-sm">
                          <p>({user.address.zipCode}) {user.address.address}</p>
                          <p className="text-gray-600">{user.address.detailAddress}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar size={16} className="text-gray-500" />
                      <span className="text-sm">
                        가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>

                    {user.marketingConsent && (
                      <div className="bg-blue-50 rounded px-3 py-2 text-sm text-blue-700">
                        ✓ 마케팅 활용 동의
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: 액션 버튼 */}
                  <div className="flex flex-col gap-3 justify-end md:justify-start">
                    <button
                      onClick={() => handleApprove(user._id)}
                      disabled={processingId === user._id}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {processingId === user._id && <Loader2 size={16} className="animate-spin" />}
                      <CheckCircle2 size={16} />
                      승인
                    </button>

                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowRejectDialog(true)
                      }}
                      disabled={processingId === user._id}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {processingId === user._id && <Loader2 size={16} className="animate-spin" />}
                      <XCircle size={16} />
                      거절
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 거절 사유 입력 다이얼로그 */}
      {showRejectDialog && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedUser.name} 사용자를 거절하시겠습니까?
            </h3>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">{selectedUser.email}</p>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              거절 사유 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력해주세요"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectDialog(false)
                  setSelectedUser(null)
                  setRejectReason('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processingId !== ''}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingId === selectedUser._id && <Loader2 size={16} className="animate-spin" />}
                거절
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
