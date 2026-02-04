'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import styles from './announcement-banner.module.css'

export default function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(true)

  const handleClose = () => {
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className={styles.bannerContainer}>
      <div className={styles.bannerContent}>
        <div className={styles.bannerText}>
          <h3 className={styles.bannerTitle}>🚀 틱톡킬라, 무료로 시작하세요</h3>

          <ul className={styles.bannerList}>
            <li>
              <span className={styles.checkmark}>💫</span>
              <span>30일 완전 무료 · 2월 3일~3월 5일</span>
            </li>
            <li>
              <span className={styles.checkmark}>💰</span>
              <span>3월부터 월 ₩32,900</span>
            </li>
            <li>
              <span className={styles.checkmark}>🎓</span>
              <span>폼나스 커머스 수강생 · 3개월 무료 (카페에서 확인)</span>
            </li>
            <li>
              <span className={styles.checkmark}>🔑</span>
              <span>회원가입 초대코드: <strong>FORMNA</strong></span>
            </li>
          </ul>
        </div>

        <button
          onClick={handleClose}
          className={styles.closeButton}
          aria-label="배너 닫기"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}
