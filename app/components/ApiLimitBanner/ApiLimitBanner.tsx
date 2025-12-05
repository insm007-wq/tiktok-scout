'use client'

import { motion } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import './ApiLimitBanner.css'

interface ApiLimitBannerProps {
  used?: number
  limit?: number
  resetTime?: string
  onClose: () => void
  deactivated?: boolean
}

export default function ApiLimitBanner({
  used,
  limit,
  resetTime,
  onClose,
  deactivated
}: ApiLimitBannerProps) {
  // resetTime은 KST 자정 (00:00)에 초기화됨
  // UTC→KST 변환으로 09:00으로 표시되는 버그가 있어서 "자정"으로 하드코딩

  // 비활성화된 계정
  if (deactivated) {
    return (
      <motion.div
        className="api-limit-banner deactivated"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        role="alert"
        aria-live="polite"
      >
        <div className="banner-header">
          <div className="banner-title">
            <AlertTriangle size={18} className="banner-icon" />
            <span>계정이 비활성화되었습니다</span>
          </div>

          <div className="banner-content">
            <div className="reset-info">
              <span className="reset-label">
                더 이상 검색할 수 없습니다. 관리자에게 문의하세요.
              </span>
            </div>
          </div>

          <button
            className="banner-close"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>
      </motion.div>
    )
  }

  // 사용 제한 초과
  const progressPercent = (used || 0) / (limit || 1) * 100

  return (
    <motion.div
      className="api-limit-banner"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      role="alert"
      aria-live="polite"
    >
      <div className="banner-header">
        <div className="banner-title">
          <AlertTriangle size={18} className="banner-icon" />
          <span>일일 검색 횟수 제한 초과</span>
        </div>

        <div className="banner-content">
          <div className="usage-info">
            <span className="usage-label">오늘 사용:</span>
            <span className="usage-count">
              {used}/{limit}회
            </span>
          </div>

          <div className="progress-container">
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="progress-percent">{Math.round(progressPercent)}%</span>
          </div>

          <div className="reset-info">
            <span className="reset-label">내일 다시 시도해주세요</span>
          </div>
        </div>

        <button
          className="banner-close"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  )
}
