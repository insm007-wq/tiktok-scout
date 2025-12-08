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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-black flex flex-col items-center justify-center px-4 py-12">
      {/* 메인 콘텐츠 */}
      <div className={`text-center max-w-3xl ${styles.animateFadeInUp}`}>
        {/* 로고/제목 */}
        <div className="mb-6">
          <h1
            onClick={handleTitleClick}
            className={`text-6xl md:text-7xl font-bold bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent mb-4 tracking-tight cursor-pointer transition-opacity hover:opacity-80 ${
              isRefreshing ? styles.titleRefresh : ""
            }`}
          >
TikTok Scout
          </h1>
          <div className="h-1.5 w-24 bg-gradient-to-r from-sky-500 to-violet-500 mx-auto rounded-full"></div>
        </div>

        {/* 부제목 */}
        <p className="text-2xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3">TikTok 영상 분석의 새로운 기준</p>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-16 leading-relaxed font-medium">
          고급 검색 필터와 실시간 통계로 트렌드를 빠르게 파악하세요
        </p>

        {/* 주요 기능 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* 기능 1 */}
          <div
            className={`${styles.glassCard} rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 group relative`}
            onMouseEnter={() => setHoveredIndex(0)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className={`${styles.cardGlow} rounded-2xl`} style={{
              background: hoveredIndex === 0 ? 'radial-gradient(circle at center, rgba(14, 165, 233, 0.3), transparent 70%)' : 'transparent'
            }}></div>
            <div className={`inline-block mb-4 group-hover:${styles.animateFloat} transition-all duration-300`} style={{
              color: hoveredIndex === 0 ? 'rgb(14, 165, 233)' : 'rgb(2, 132, 199)'
            }}>
              <BarChart3 size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">정밀한 검색</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
              기간, 영상 길이, 구독자 비율별로 원하는 콘텐츠를 정확하게 찾으세요
            </p>
          </div>

          {/* 기능 2 */}
          <div
            className={`${styles.glassCard} rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 group relative`}
            onMouseEnter={() => setHoveredIndex(1)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className={`${styles.cardGlow} rounded-2xl`} style={{
              background: hoveredIndex === 1 ? 'radial-gradient(circle at center, rgba(147, 51, 234, 0.3), transparent 70%)' : 'transparent'
            }}></div>
            <div className={`inline-block mb-4 group-hover:${styles.animateFloat} transition-all duration-300`} style={{
              color: hoveredIndex === 1 ? 'rgb(147, 51, 234)' : 'rgb(109, 40, 217)'
            }}>
              <TrendingUp size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">심층 분석</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
              조회수, 구독자, 참여율 등 주요 지표를 한눈에 파악하고 비교하세요
            </p>
          </div>

          {/* 기능 3 */}
          <div
            className={`${styles.glassCard} rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 group relative`}
            onMouseEnter={() => setHoveredIndex(2)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className={`${styles.cardGlow} rounded-2xl`} style={{
              background: hoveredIndex === 2 ? 'radial-gradient(circle at center, rgba(79, 70, 229, 0.3), transparent 70%)' : 'transparent'
            }}></div>
            <div className={`inline-block mb-4 group-hover:${styles.animateFloat} transition-all duration-300`} style={{
              color: hoveredIndex === 2 ? 'rgb(79, 70, 229)' : 'rgb(67, 56, 202)'
            }}>
              <Download size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">데이터 내보내기</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
              분석 결과를 엑셀로 저장하고 검색을 저장하여 재사용하세요
            </p>
          </div>
        </div>

        {/* CTA 섹션 */}
        <div className="space-y-6">
          {/* 시작하기 버튼 */}
          <Link
            href="/dashboard"
            className="inline-block bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 text-white font-bold py-4 px-16 rounded-xl text-lg transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 no-underline"
          >
            지금 시작하기
          </Link>
        </div>
      </div>

      {/* 하단 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute bottom-0 left-0 w-96 h-96 bg-sky-300 dark:bg-sky-900 rounded-full mix-blend-multiply filter blur-3xl opacity-10 -z-10 ${styles.bgAnimated}`}></div>
        <div className={`absolute top-0 right-0 w-96 h-96 bg-violet-300 dark:bg-violet-900 rounded-full mix-blend-multiply filter blur-3xl opacity-10 -z-10 ${styles.bgAnimated}`} style={{ animationDelay: '-3s' }}></div>
      </div>
    </div>
  );
}
