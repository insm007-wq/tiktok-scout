"use client";

import Link from "next/link";

export default function DashboardFooter() {
  return (
    <footer className="border-t border-green-500/20 bg-gradient-to-b from-slate-900 via-slate-950 to-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick links */}
        <div className="flex flex-wrap gap-2 items-center mb-6 text-sm leading-tight justify-center">
          <Link href="/pricing" className="text-white/60 hover:text-cyan-400 transition-colors">
            요금제
          </Link>
          <span className="text-white/30">|</span>
          <Link href="/refund-policy" className="text-white/60 hover:text-cyan-400 transition-colors">
            환불정책
          </Link>
          <span className="text-white/30">|</span>
          <Link href="/terms" className="text-white/60 hover:text-cyan-400 transition-colors">
            이용약관
          </Link>
          <span className="text-white/30">|</span>
          <Link href="/privacy" className="text-white/60 hover:text-cyan-400 transition-colors">
            개인정보처리방침
          </Link>
          <span className="text-white/30">|</span>
          <Link href="/contact" className="text-white/60 hover:text-cyan-400 transition-colors">
            고객센터
          </Link>
        </div>

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
        <div className="border-t border-white/10 my-4" />

        {/* Bottom Copyright */}
        <div className="text-xs text-white/40 text-center">
          <p>© 2025 TikTalk Killa. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
