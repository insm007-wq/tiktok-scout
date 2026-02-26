'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { User, LogOut, ChevronDown, KeyRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import WithdrawModal from './WithdrawModal'
import ChangePasswordModal from './ChangePasswordModal'
import './UserDropdown.css'

interface UserDropdownProps {
  onOpenSubscription?: () => void
}

export default function UserDropdown({ onOpenSubscription }: UserDropdownProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await signOut({
      redirect: true,
      callbackUrl: '/auth/login'
    })
  }

  const handleSubscription = () => {
    onOpenSubscription?.()
    setIsOpen(false)
  }

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    const response = await fetch('/api/user/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    let data: { error?: string } = {}
    try {
      data = await response.json()
    } catch {
      // 응답이 JSON이 아닌 경우
    }

    if (!response.ok) {
      throw new Error(data.error || `비밀번호 변경에 실패했습니다. (${response.status})`)
    }

    // 성공 시 모달이 성공 메시지 표시 후 onClose 호출
  }

  const handleWithdraw = async (password: string) => {
    setIsWithdrawing(true)

    try {
      const response = await fetch('/api/auth/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '회원 탈퇴 처리 중 오류가 발생했습니다')
      }

      // 탈퇴 성공 - 모달 닫고 로그아웃
      setShowWithdrawModal(false)
      setIsOpen(false)

      // 로그아웃
      await signOut({
        redirect: true,
        callbackUrl: '/auth/login'
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '오류가 발생했습니다'
      throw error
    } finally {
      setIsWithdrawing(false)
    }
  }

  if (!session) return null

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <button
        className="user-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <User size={16} />
        <span className="user-email">{session.user.email}</span>
        <ChevronDown size={14} className={isOpen ? 'rotate' : ''} />
      </button>

      {isOpen && (
        <div className="user-menu">
          <div className="user-info">
            <div className="info-row">
              <span className="label">이메일:</span>
              <span className="value">{session.user.email}</span>
            </div>
            {session.user.name && (
              <div className="info-row">
                <span className="label">이름:</span>
                <span className="value">{session.user.name}</span>
              </div>
            )}
            {session.user.phone && (
              <div className="info-row">
                <span className="label">핸드폰:</span>
                <span className="value">{session.user.phone}</span>
              </div>
            )}
          </div>

          <div className="menu-divider" />

          <button
            className="subscription-btn"
            onClick={handleSubscription}
            disabled={isWithdrawing}
          >
            구독
          </button>

          <button
            className="change-password-btn"
            onClick={() => setShowChangePasswordModal(true)}
            disabled={isWithdrawing}
          >
            <KeyRound size={16} />
            비밀번호 변경
          </button>

          <button
            className="withdraw-btn"
            onClick={() => setShowWithdrawModal(true)}
            disabled={isWithdrawing}
          >
            회원 탈퇴
          </button>

          <button
            className="logout-btn"
            onClick={handleLogout}
            disabled={isWithdrawing}
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      )}

      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => {
          setShowWithdrawModal(false)
          setIsOpen(false)
        }}
        onConfirm={handleWithdraw}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => {
          setShowChangePasswordModal(false)
          setIsOpen(false)
        }}
        onConfirm={handleChangePassword}
      />
    </div>
  )
}
