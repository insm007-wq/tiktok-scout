'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Users, Search, ChevronDown } from 'lucide-react'
import './users.css'

interface User {
  _id: string
  email: string
  name?: string
  phone?: string
  isActive: boolean
  isBanned: boolean
  isAdmin?: boolean
  isApproved?: boolean
  createdAt: string
  lastLogin?: string
  lastActive: string
}

interface ListResponse {
  success: boolean
  users: User[]
  total: number
  page: number
  limit: number
  pages: number
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'banned'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all')
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all')
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showBanModal, setShowBanModal] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [actionInProgress, setActionInProgress] = useState(false)

  // 관리자 확인
  useEffect(() => {
    if (status === 'loading') return
    if (!session || !session.user?.isAdmin) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  // 사용자 목록 조회
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        role: roleFilter,
        approved: approvalFilter,
        page: page.toString(),
        limit: limit.toString(),
      })

      const response = await fetch(`/api/admin/users/list?${params}`)
      const data = (await response.json()) as ListResponse

      if (data.success) {
        setUsers(data.users)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchUsers()
    }
  }, [search, statusFilter, roleFilter, approvalFilter, page, session])

  // 액션 함수들
  const handleBan = async (user: User) => {
    setSelectedUser(user)
    setBanReason('')
    setShowBanModal(true)
  }

  const confirmBan = async () => {
    if (!selectedUser) return
    setActionInProgress(true)
    try {
      const response = await fetch('/api/admin/users/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          reason: banReason,
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('사용자가 차단되었습니다')
        fetchUsers()
      }
    } catch (error) {
      alert('차단 중 오류가 발생했습니다')
    } finally {
      setActionInProgress(false)
      setShowBanModal(false)
    }
  }

  const handleUnban = async (user: User) => {
    if (confirm('정말 차단을 해제하시겠습니까?')) {
      setActionInProgress(true)
      try {
        const response = await fetch('/api/admin/users/unban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
        })

        const data = await response.json()
        if (data.success) {
          alert('차단이 해제되었습니다')
          fetchUsers()
        }
      } catch (error) {
        alert('차단 해제 중 오류가 발생했습니다')
      } finally {
        setActionInProgress(false)
      }
    }
  }

  const handleToggleActive = async (user: User, newState: boolean) => {
    setActionInProgress(true)
    try {
      const response = await fetch('/api/admin/users/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          isActive: newState,
        }),
      })

      const data = await response.json()
      if (data.success) {
        fetchUsers()
      }
    } catch (error) {
      alert('상태 변경 중 오류가 발생했습니다')
    } finally {
      setActionInProgress(false)
    }
  }

  const handleToggleAdmin = async (user: User, makeAdmin: boolean) => {
    if (confirm(`정말 ${user.email}을(를) ${makeAdmin ? '관리자' : '일반 사용자'}로 변경하시겠습니까?`)) {
      setActionInProgress(true)
      try {
        const response = await fetch('/api/admin/users/update-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            isAdmin: makeAdmin,
          }),
        })

        const data = await response.json()
        if (data.success) {
          fetchUsers()
        }
      } catch (error) {
        alert('권한 변경 중 오류가 발생했습니다')
      } finally {
        setActionInProgress(false)
      }
    }
  }

  const handleApprove = async (user: User) => {
    if (confirm(`${user.email}을(를) 승인하시겠습니까?`)) {
      setActionInProgress(true)
      try {
        const response = await fetch('/api/admin/users/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
        })

        const data = await response.json()
        if (data.success) {
          alert('사용자가 승인되었습니다')
          fetchUsers()
        }
      } catch (error) {
        alert('승인 중 오류가 발생했습니다')
      } finally {
        setActionInProgress(false)
      }
    }
  }

  const handleReject = async (user: User) => {
    if (confirm(`정말 ${user.email}의 가입을 거절하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      setActionInProgress(true)
      try {
        const response = await fetch('/api/admin/users/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
        })

        const data = await response.json()
        if (data.success) {
          alert('사용자가 거절되었습니다')
          fetchUsers()
        }
      } catch (error) {
        alert('거절 중 오류가 발생했습니다')
      } finally {
        setActionInProgress(false)
      }
    }
  }

  const getStatusBadge = (user: User) => {
    if (user.isBanned) {
      return <span className="badge badge-red">차단됨</span>
    }
    if (!user.isActive) {
      return <span className="badge badge-gray">비활성</span>
    }
    return <span className="badge badge-green">활성</span>
  }

  const getApprovalBadge = (user: User) => {
    if (user.isApproved) {
      return <span className="badge badge-green">승인됨</span>
    }
    return <span className="badge badge-yellow">대기중</span>
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (status === 'loading') {
    return <div className="admin-loading">로딩 중...</div>
  }

  return (
    <div className="admin-container">
      {/* 헤더 */}
      <div className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1 className="admin-title">사용자 관리</h1>
            <p className="admin-subtitle">전체 사용자 보기 및 관리</p>
          </div>
          <div className="admin-user-info">
            <p>관리자: <span className="font-semibold">{session?.user?.email}</span></p>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="admin-content">
        {/* 검색 및 필터 */}
        <div className="filter-section">
          {/* 검색바 */}
          <div className="search-box">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="이메일, 이름, 전화번호로 검색..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="search-input"
            />
          </div>

          {/* 필터 드롭다운 */}
          <div className="filter-dropdown-group">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any)
                setPage(1)
              }}
              className="filter-select"
            >
              <option value="all">상태: 전체</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="banned">차단</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as any)
                setPage(1)
              }}
              className="filter-select"
            >
              <option value="all">권한: 전체</option>
              <option value="admin">관리자</option>
              <option value="user">일반 사용자</option>
            </select>

            <select
              value={approvalFilter}
              onChange={(e) => {
                setApprovalFilter(e.target.value as any)
                setPage(1)
              }}
              className="filter-select"
            >
              <option value="all">승인: 전체</option>
              <option value="approved">승인됨</option>
              <option value="pending">대기중</option>
            </select>
          </div>
        </div>

        {/* 사용자 테이블 */}
        <div className="table-section">
          {loading ? (
            <div className="table-loading">로딩 중...</div>
          ) : users.length === 0 ? (
            <div className="table-empty">
              <Users size={48} className="empty-icon" />
              <p>사용자가 없습니다</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>이메일</th>
                      <th>전화번호</th>
                      <th>상태</th>
                      <th>권한</th>
                      <th>승인</th>
                      <th>가입일</th>
                      <th>마지막 로그인</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="table-row">
                        <td className="table-name">{user.name || '-'}</td>
                        <td className="table-email">{user.email}</td>
                        <td className="table-phone">{user.phone || '-'}</td>
                        <td className="table-status">{getStatusBadge(user)}</td>
                        <td className="table-role">
                          {user.isAdmin ? (
                            <span className="badge badge-blue">관리자</span>
                          ) : (
                            <span className="badge badge-gray">일반</span>
                          )}
                        </td>
                        <td className="table-approval">{getApprovalBadge(user)}</td>
                        <td className="table-date">{formatDate(user.createdAt)}</td>
                        <td className="table-date">{formatDate(user.lastLogin)}</td>
                        <td className="table-actions">
                          <button
                            onClick={() => {
                              setSelectedUser(user)
                              setShowDetailModal(true)
                            }}
                            className="action-btn action-view"
                            disabled={actionInProgress}
                          >
                            상세
                          </button>
                          {!user.isBanned ? (
                            <button
                              onClick={() => handleBan(user)}
                              className="action-btn action-ban"
                              disabled={actionInProgress}
                            >
                              차단
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnban(user)}
                              className="action-btn action-unban"
                              disabled={actionInProgress}
                            >
                              해제
                            </button>
                          )}
                          {!user.isApproved && (
                            <>
                              <button
                                onClick={() => handleApprove(user)}
                                className="action-btn action-approve"
                                disabled={actionInProgress}
                              >
                                승인
                              </button>
                              <button
                                onClick={() => handleReject(user)}
                                className="action-btn action-reject"
                                disabled={actionInProgress}
                              >
                                거절
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleToggleAdmin(user, !user.isAdmin)}
                            className={`action-btn ${user.isAdmin ? 'action-revoke' : 'action-promote'}`}
                            disabled={actionInProgress}
                          >
                            {user.isAdmin ? '권한해제' : '관리자'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              <div className="pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="pagination-btn"
                >
                  이전
                </button>
                <span className="pagination-info">
                  {page} / {Math.ceil(total / limit)} 페이지 (총 {total}명)
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / limit) || loading}
                  className="pagination-btn"
                >
                  다음
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 상세 정보 모달 */}
      {showDetailModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">사용자 정보</h2>
            <div className="modal-body">
              <div className="info-group">
                <label>이메일</label>
                <p>{selectedUser.email}</p>
              </div>
              <div className="info-group">
                <label>이름</label>
                <p>{selectedUser.name || '-'}</p>
              </div>
              <div className="info-group">
                <label>전화번호</label>
                <p>{selectedUser.phone || '-'}</p>
              </div>
              <div className="info-group">
                <label>상태</label>
                <p>{getStatusBadge(selectedUser)}</p>
              </div>
              <div className="info-group">
                <label>권한</label>
                <p>{selectedUser.isAdmin ? '관리자' : '일반 사용자'}</p>
              </div>
              <div className="info-group">
                <label>승인 여부</label>
                <p>{getApprovalBadge(selectedUser)}</p>
              </div>
              <div className="info-group">
                <label>가입일</label>
                <p>{formatDate(selectedUser.createdAt)}</p>
              </div>
              <div className="info-group">
                <label>마지막 활동</label>
                <p>{formatDate(selectedUser.lastActive)}</p>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowDetailModal(false)}
                className="modal-btn modal-btn-close"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 차단 모달 */}
      {showBanModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowBanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">사용자 차단</h2>
            <div className="modal-body">
              <p className="mb-4">
                <strong>{selectedUser.email}</strong>을(를) 차단하시겠습니까?
              </p>
              <div className="form-group">
                <label htmlFor="banReason">차단 사유 (선택사항)</label>
                <textarea
                  id="banReason"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="차단 사유를 입력해주세요"
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowBanModal(false)}
                className="modal-btn modal-btn-cancel"
                disabled={actionInProgress}
              >
                취소
              </button>
              <button
                onClick={confirmBan}
                className="modal-btn modal-btn-ban"
                disabled={actionInProgress}
              >
                {actionInProgress ? '처리 중...' : '차단'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
