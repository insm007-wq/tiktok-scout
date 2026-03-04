'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff, Loader } from 'lucide-react'
import styles from './ChangePasswordModal.module.css'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (currentPassword: string, newPassword: string) => Promise<void>
}

export default function ChangePasswordModal({ isOpen, onClose, onConfirm }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
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

    if (!currentPassword.trim()) {
      setError('현재 비밀번호를 입력해주세요.')
      return
    }
    if (!newPassword.trim()) {
      setError('새 비밀번호를 입력해주세요.')
      return
    }
    if (newPassword.length < 8 || newPassword.length > 50) {
      setError('비밀번호는 8자 이상 50자 이하여야 합니다.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.')
      return
    }
    if (currentPassword === newPassword) {
      setError('새 비밀번호는 현재 비밀번호와 달라야 합니다.')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      await onConfirm(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (isLoading) return
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
    onClose()
  }

  if (!isOpen || !mounted) return null

  const modal = (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>패스워드 변경</h2>
          <p className={styles.subtitle}>보안을 위해 새 비밀번호를 설정해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="currentPassword">현재 비밀번호</label>
            <div className={styles.inputWrap}>
              <input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호"
                disabled={isLoading}
                autoComplete="current-password"
                className={styles.input}
              />
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? '숨기기' : '보기'}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="newPassword">새 비밀번호</label>
            <div className={styles.inputWrap}>
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8자 이상"
                disabled={isLoading}
                autoComplete="new-password"
                className={styles.input}
              />
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? '숨기기' : '보기'}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">새 비밀번호 확인</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="다시 입력"
              disabled={isLoading}
              autoComplete="new-password"
              className={styles.input}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {success && (
            <p className={styles.success}>비밀번호가 변경되었습니다.</p>
          )}

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
              {isLoading ? '변경 중...' : '변경하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
