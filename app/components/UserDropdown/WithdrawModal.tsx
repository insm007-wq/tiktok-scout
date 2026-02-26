'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Loader } from 'lucide-react'
import styles from './WithdrawModal.module.css'

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => Promise<void>
}

export default function WithdrawModal({ isOpen, onClose, onConfirm }: WithdrawModalProps) {
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = ''
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    try {
      await onConfirm(password)
      setPassword('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (isLoading) return
    setPassword('')
    setError('')
    onClose()
  }

  if (!isOpen || !mounted) return null

  const modal = (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>회원 탈퇴</h2>
          <p className={styles.subtitle}>탈퇴 시 14일 동안 동일 이메일로 재가입할 수 없습니다</p>
        </div>

        <div className={styles.warningBox}>
          <AlertCircle size={20} />
          <div>
            <p className={styles.warningTitle}>주의</p>
            <p className={styles.warningText}>
              회원을 탈퇴하시면 14일 동안 동일한 이메일로 재가입할 수 없습니다.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="password">비밀번호 확인</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력해주세요"
              disabled={isLoading}
              autoComplete="current-password"
              className={styles.input}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? <Loader size={18} className={styles.spinner} /> : null}
              {isLoading ? '처리 중...' : '탈퇴하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
