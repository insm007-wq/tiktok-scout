"use client";

import Link from "next/link";

export default function DarkFooter() {
  return (
    <footer className="bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Links - Single Line */}
        <div className="flex flex-wrap gap-1.5 items-center mb-4 text-sm leading-tight justify-center">
          {/* 서비스 */}
          <Link href="/pricing" className="text-white/60 hover:text-cyan-400 transition-colors">
            요금제
          </Link>
          <span className="text-white/30">|</span>

          <Link href="/dashboard" className="text-white/60 hover:text-cyan-400 transition-colors">
            대시보드
          </Link>
          <span className="text-white/30">|</span>

          <a href="mailto:sinmok84@hanmil.net" className="text-white/60 hover:text-cyan-400 transition-colors">
            고객문의
          </a>
          <span className="text-white/30">|</span>

          {/* 회사 */}
          <Link href="/" className="text-white/60 hover:text-cyan-400 transition-colors">
            제휴/입점
          </Link>
          <span className="text-white/30">|</span>

          {/* 정책 */}
          <Link href="/terms" className="text-white/60 hover:text-cyan-400 transition-colors">
            이용약관
          </Link>
          <span className="text-white/30">|</span>

          <Link href="/privacy" className="text-white/60 hover:text-cyan-400 transition-colors">
            개인정보처리방침
          </Link>
          <span className="text-white/30">|</span>

          <Link href="/refund-policy" className="text-white/60 hover:text-cyan-400 transition-colors">
            환불정책
          </Link>
          <span className="text-white/30">|</span>

          {/* 기타 */}
          <Link href="/" className="text-white/60 hover:text-cyan-400 transition-colors">
            공지사항
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-white/20 my-6" />

        {/* Business Information */}
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs mb-4">
            <div>
              <p className="text-white/50 mb-1">상호</p>
              <p className="text-white/80">씨너지나노 (SYNERGY NANO)</p>
            </div>
            <div>
              <p className="text-white/50 mb-1">대표자</p>
              <p className="text-white/80">권오룡</p>
            </div>
            <div>
              <p className="text-white/50 mb-1">사업자등록번호</p>
              <p className="text-white/80">299-86-03770</p>
            </div>
            <div>
              <p className="text-white/50 mb-1">이메일</p>
              <p className="text-white/80">sinmok84@hanmil.net</p>
            </div>
          </div>

          <p className="text-white/60 text-xs leading-relaxed">
            주소: 세종특별자치시 갈매로 363, 405호 |
            <span className="inline-block ml-2">운영시간: 월-금 10:00-18:00 (공휴일 제외)</span>
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/20 my-4" />

        {/* Bottom Copyright */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-xs text-white/40">
          <p>© 2025 TikTalk Killa. All rights reserved.</p>
          <p>TikTok, Douyin, Xiaohongshu는 각 회사의 상표입니다.</p>
        </div>
      </div>
    </footer>
  );
}
