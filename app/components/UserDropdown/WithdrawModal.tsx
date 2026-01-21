'use client'

import { useState } from 'react'
import { AlertCircle, Loader } from 'lucide-react'
import './WithdrawModal.css'

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => Promise<void>
}

export default function WithdrawModal({ isOpen, onClose, onConfirm }: WithdrawModalProps) {
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password.trim()) {
      setError('비밀번호를 입력해주세요')
      return
    }

    setIsLoading(true)

    try {
      await onConfirm(password)
      // 성공 시 모달 자동 닫음 (부모 컴포넌트에서 처리)
      setPassword('')
    } catch (err) {
      const message = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="withdraw-modal-overlay" onClick={handleClose}>
      <div className="withdraw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>회원 탈퇴</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="warning-box">
            <AlertCircle size={20} />
            <div>
              <p className="warning-title">주의</p>
              <p className="warning-text">회원을 탈퇴하시면 14일 동안 동일한 이메일로 재가입할 수 없습니다.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">비밀번호 확인</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleClose}
                disabled={isLoading}
              >
                취소
              </button>
              <button
                type="submit"
                className="confirm-btn"
                disabled={isLoading}
              >
                {isLoading && <Loader size={16} className="spinner" />}
                {isLoading ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
