"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, TrendingUp, Download } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTitleClick = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      window.location.reload();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#121218] to-[#1a1a24] flex flex-col items-center justify-center px-4 py-12">
      {/* 메인 콘텐츠 */}
      <div className={`text-center max-w-3xl ${styles.animateFadeInUp}`}>
        {/* 로고/제목 */}
        <div className="mb-6">
          <h1
            onClick={handleTitleClick}
            className={`text-7xl md:text-8xl font-extrabold bg-gradient-to-r from-[#d4af37] via-[#f4d03f] to-[#e5e4e2] bg-clip-text text-transparent mb-4 tracking-tighter uppercase cursor-pointer transition-opacity hover:opacity-80 ${
              isRefreshing ? styles.titleRefresh : ""
            } ${styles.shimmerText}`}
          >
tiktok killa
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-[#d4af37] to-[#c0c0c0] mx-auto rounded-full"></div>
        </div>

        {/* 부제목 */}
        <p className="text-3xl font-semibold text-white mb-3">TikTok 영상 분석의 새로운 기준</p>
        <p className="text-lg text-[#a8a8b8] mb-32 leading-relaxed font-medium">
          고급 검색 필터와 실시간 통계로 트렌드를 빠르게 파악하세요
        </p>

        {/* 주요 기능 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-48">
          {/* 기능 1 */}
          <div
            className={`${styles.premiumCard} rounded-3xl p-10 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 group relative`}
            onMouseEnter={() => setHoveredIndex(0)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className={`${styles.cardGlow} rounded-3xl`} style={{
              background: hoveredIndex === 0 ? 'radial-gradient(circle at center, rgba(212, 175, 55, 0.3), transparent 70%)' : 'transparent'
            }}></div>
            <div className={`inline-block mb-4 group-hover:${styles.animateFloat} transition-all duration-300`} style={{
              color: hoveredIndex === 0 ? 'rgb(244, 208, 63)' : 'rgb(212, 175, 55)'
            }}>
              <BarChart3 size={56} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">정밀한 검색</h3>
            <p className="text-[#a8a8b8] text-base leading-relaxed font-medium">
              기간, 영상 길이, 구독자 비율별로 원하는 콘텐츠를 정확하게 찾으세요
            </p>
          </div>

          {/* 기능 2 */}
          <div
            className={`${styles.premiumCard} rounded-3xl p-10 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 group relative`}
            onMouseEnter={() => setHoveredIndex(1)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className={`${styles.cardGlow} rounded-3xl`} style={{
              background: hoveredIndex === 1 ? 'radial-gradient(circle at center, rgba(212, 175, 55, 0.3), transparent 70%)' : 'transparent'
            }}></div>
            <div className={`inline-block mb-4 group-hover:${styles.animateFloat} transition-all duration-300`} style={{
              color: hoveredIndex === 1 ? 'rgb(244, 208, 63)' : 'rgb(212, 175, 55)'
            }}>
              <TrendingUp size={56} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">심층 분석</h3>
            <p className="text-[#a8a8b8] text-base leading-relaxed font-medium">
              조회수, 구독자, 참여율 등 주요 지표를 한눈에 파악하고 비교하세요
            </p>
          </div>

          {/* 기능 3 */}
          <div
            className={`${styles.premiumCard} rounded-3xl p-10 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 group relative`}
            onMouseEnter={() => setHoveredIndex(2)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className={`${styles.cardGlow} rounded-3xl`} style={{
              background: hoveredIndex === 2 ? 'radial-gradient(circle at center, rgba(212, 175, 55, 0.3), transparent 70%)' : 'transparent'
            }}></div>
            <div className={`inline-block mb-4 group-hover:${styles.animateFloat} transition-all duration-300`} style={{
              color: hoveredIndex === 2 ? 'rgb(244, 208, 63)' : 'rgb(212, 175, 55)'
            }}>
              <Download size={56} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">데이터 내보내기</h3>
            <p className="text-[#a8a8b8] text-base leading-relaxed font-medium">
              분석 결과를 엑셀로 저장하고 검색을 저장하여 재사용하세요
            </p>
          </div>
        </div>

        {/* CTA 섹션 */}
        <div className="space-y-6">
          {/* 시작하기 버튼 */}
          <Link
            href="/dashboard"
            className={`inline-block bg-gradient-to-r from-[#d4af37] via-[#f4d03f] to-[#e5e4e2] text-[#0a0a0f] font-bold py-5 px-20 rounded-2xl text-lg uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 no-underline ${styles.buttonShimmer}`}
          >
            지금 시작하기
          </Link>
        </div>
      </div>

      {/* 하단 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 left-20 w-[600px] h-[600px] bg-[#d4af37] rounded-full mix-blend-multiply filter blur-[120px] opacity-[0.06] -z-10 ${styles.premiumOrb}`}></div>
        <div className={`absolute bottom-20 right-20 w-[800px] h-[800px] bg-[#c0c0c0] rounded-full mix-blend-multiply filter blur-[140px] opacity-[0.04] -z-10 ${styles.premiumOrb}`} style={{ animationDelay: '-3s' }}></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#e5e4e2] rounded-full mix-blend-multiply filter blur-[100px] opacity-[0.03] -z-10 ${styles.pulsingOrb}`}></div>
      </div>
    </div>
  );
}
