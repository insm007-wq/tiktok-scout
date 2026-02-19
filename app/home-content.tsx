"use client";

import Link from "next/link";
import { useState } from "react";
import AnnouncementBanner from "./announcement-banner";
import styles from "./page.module.css";

export default function HomeContent() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTitleClick = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const platforms = [
    {
      id: 0,
      platform: "TikTok",
      icon: "🎵",
      gradient: "from-[#FE2C55] to-[#25F4EE]",
      title: "TikTok Global",
      description: "전세계 트렌드를 실시간으로",
      features: ["글로벌 바이럴 영상", "해시태그 분석", "크리에이터 통계"],
    },
    {
      id: 1,
      platform: "Douyin",
      icon: "🎬",
      gradient: "from-[#EE1D51] to-[#FF6B9D]",
      title: "Douyin China",
      description: "중국 시장의 모든 것",
      features: ["중국 트렌드 발굴", "한중 번역 지원", "로컬 인사이트"],
    },
    {
      id: 2,
      platform: "레드노트",
      icon: "📕",
      gradient: "from-[#FE2C55] to-[#FF6B35]",
      title: "레드노트",
      description: "샤오홍슈 영상 검색",
      features: ["키워드 검색", "조회수·메타데이터", "이미지·영상 분석"],
    },
  ];

  return (
    <div className={styles.mainContainer}>
      {/* 배경 요소들 */}
      <div className={styles.bgOrbs}>
        <div className={`${styles.orb} ${styles.orb1}`}></div>
        <div className={`${styles.orb} ${styles.orb2}`}></div>
        <div className={`${styles.orb} ${styles.orb3}`}></div>
      </div>
      <div className={styles.gridPattern}></div>
      <div className={styles.platformWatermarks}>
        <div className={`${styles.platformLogo} ${styles.tiktokLogo}`}></div>
        <div className={`${styles.platformLogo} ${styles.douyinLogo}`}></div>
        <div className={`${styles.platformLogo} ${styles.xiaohongshuLogo}`}></div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className={`${styles.contentWrapper} ${styles.animateFadeInUp}`}>
        {/* 공지사항 배너 */}
        <AnnouncementBanner />

        {/* 타이틀 */}
        <div className={styles.titleSection}>
          <h1 onClick={handleTitleClick} className={`${styles.neonTitle} ${isRefreshing ? styles.titleRefresh : ""}`}>
            틱톡킬라
          </h1>
          <div className={styles.titleUnderline}></div>
          <p style={{ textAlign: 'center', fontSize: '0.9em', opacity: 0.7, marginTop: '0.5em' }}>
            TikTalk Killa - 틱톡 영상 검색 및 분석
          </p>
        </div>

        {/* 히어로 섹션 */}
        <div className={styles.heroSection}>
          <h2 className={styles.heroTitle}>숏폼의 모든 것을 한눈에</h2>
          <p className={styles.heroSubtitle}>TikTok · Douyin · 샤오홍슈 | 3개 플랫폼, 무한한 인사이트</p>

          {/* 통계 하이라이트 */}
          <div className={styles.statsHighlight}>
            <span className={styles.statItem}>
              <span className={styles.neonText}>3</span> 플랫폼
            </span>
            <span className={styles.divider}>•</span>
            <span className={styles.statItem}>
              <span className={styles.neonText}>∞</span> 영상
            </span>
            <span className={styles.divider}>•</span>
            <span className={styles.statItem}>
              <span className={styles.neonText}>실시간</span> 분석
            </span>
          </div>
        </div>

        {/* 플랫폼 카드들 */}
        <div className={styles.platformCardsGrid}>
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className={styles.platformCard}
              style={
                {
                  "--gradient": `linear-gradient(135deg, var(--${
                    platform.id === 0 ? "pink" : platform.id === 1 ? "red" : "pink-light"
                  }), var(--${platform.id === 0 ? "cyan" : platform.id === 1 ? "red" : "pink-light"}))`,
                } as any
              }
              onMouseEnter={() => setHoveredCard(platform.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className={styles.cardGradient}></div>
              <div className={styles.cardContent}>
                <div className={styles.platformIcon}>{platform.icon}</div>
                <h3 className={styles.platformTitle}>{platform.title}</h3>
                <p className={styles.platformDescription}>{platform.description}</p>
                <ul className={styles.featuresList}>
                  {platform.features.map((feature, idx) => (
                    <li key={idx} className={styles.featureItem}>
                      <span className={styles.featureBullet}>•</span> {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* CTA 버튼 */}
        <Link href="/dashboard" className={styles.neonCtaButton}>
          <span className={styles.ctaText}>지금 시작하기</span>
          <span className={styles.ctaArrow}>→</span>
        </Link>
      </div>
    </div>
  );
}
