'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { User, LogOut, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import WithdrawModal from './WithdrawModal'
import './UserDropdown.css'

export default function UserDropdown() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
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
    setShowSubscriptionModal(true)
    setIsOpen(false)
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
            className="withdraw-btn"
            onClick={() => setShowWithdrawModal(true)}
            disabled={isWithdrawing}
          >
            회원 탈퇴
          </button>

          <button
            className="subscription-btn"
            onClick={handleSubscription}
            disabled={isWithdrawing}
          >
            구독
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
        onClose={() => setShowWithdrawModal(false)}
        onConfirm={handleWithdraw}
      />

      {/* 구독 모달 */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-white">요금제 선택</h3>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* 요금제 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                {
                  id: 'light',
                  name: '라이트',
                  price: 19800,
                  total: 20,
                  description: '시작하기 좋은 기본 플랜',
                },
                {
                  id: 'pro',
                  name: '프로',
                  price: 29800,
                  total: 40,
                  description: '가장 인기있는 플랜',
                },
                {
                  id: 'pro-plus',
                  name: '프로+',
                  price: 39800,
                  total: 50,
                  description: '전문가용 플랜',
                },
                {
                  id: 'ultra',
                  name: '울트라',
                  price: 49800,
                  total: 100,
                  description: '최고의 모든 기능',
                },
              ].map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg p-4 border border-white/10 bg-white/10 hover:border-white/30 hover:bg-white/15 transition-all cursor-pointer"
                >
                  <h4 className="text-lg font-bold text-white mb-2">
                    {plan.name}
                  </h4>
                  <p className="text-sm text-white/60 mb-3">{plan.description}</p>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-pink-400">
                      ₩{plan.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/60">/월</p>
                  </div>
                  <div className="bg-white/10 border border-white/20 rounded-lg p-2.5 mb-4">
                    <p className="text-sm text-cyan-400">
                      📊 일일 사용:{' '}
                      <span className="font-bold">
                        {plan.total === -1 ? '무제한' : `${plan.total}회`}
                      </span>
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      (검색 + 다운로드 + 자막 합산)
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSubscriptionModal(false)}
                    className="w-full py-2 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-cyan-500 to-pink-400 text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                  >
                    선택
                  </button>
                </div>
              ))}
            </div>

            {/* 안내 메시지 */}
            <div className="bg-white/10 border border-white/20 rounded-lg p-4 text-sm text-white/70">
              <p>
                💳 결제 기능은 준비 중입니다. 곧 토스 페이먼츠를 통해 결제 가능하게 됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
