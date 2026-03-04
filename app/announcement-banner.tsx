"use client";

import { useState } from "react";
import { X } from "lucide-react";
import styles from "./announcement-banner.module.css";

// 추후 공지사항 숨김 시 false로 변경
const SHOW_ANNOUNCEMENT = true;

export default function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(SHOW_ANNOUNCEMENT);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.bannerContainer}>
      <div className={styles.bannerContent}>
        <div className={styles.bannerText}>
          <h3 className={styles.bannerTitle}>🚀 틱톡킬라, 신규 업데이트로 인하여 &lt;재가입&gt;을 해주시기 바랍니다.</h3>

          <ul className={styles.bannerList}>
            <li>
              <span className={styles.checkmark}>💰</span>
              <span>라이트 ₩19,800 · 프로 ₩29,800</span>
            </li>
            <li>
              <span className={styles.checkmark}>🎓</span>
              <span>폼나느 커머스 수강생 · 3개월 무료 · 2월 3일 ~ 5월 3일</span>
            </li>
            <li>
              <span className={styles.checkmark}>🔑</span>
              <span>무료 초대코드: 폼나는커머스 카페 공지 확인</span>
            </li>
          </ul>
        </div>

        <button onClick={handleClose} className={styles.closeButton} aria-label="배너 닫기">
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
