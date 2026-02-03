'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import styles from './announcement-banner.module.css'

export default function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 로컬스토리지에서 오늘 닫았는지 확인
    const today = new Date().toISOString().split('T')[0]
    const closedDate = localStorage.getItem('announcementBannerClosed')

    if (closedDate !== today) {
      setIsVisible(true)
    }
  }, [])

  const handleClose = () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('announcementBannerClosed', today)
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className={styles.bannerContainer}>
      <div className={styles.bannerContent}>
        <div className={styles.bannerText}>
          <h3 className={styles.bannerTitle}>🎉 틱톡킬라 무료 이용 한 달 더 연장!</h3>

          <ul className={styles.bannerList}>
            <li>
              <span className={styles.checkmark}>✔</span>
              <span>일주일 체험 코드 입력자 → 3/1까지 자동 연장!</span>
            </li>
            <li>
              <span className={styles.checkmark}>✔</span>
              <span>3월부터 정식 요금제: 월 32,900원</span>
            </li>
            <li>
              <span className={styles.checkmark}>✔</span>
              <span>폼나는커머스 수강생 → 3개월 무료 코드, 수강생 카페 확인!</span>
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
