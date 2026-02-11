"use client";

import Link from "next/link";

export default function LightFooter() {
  return (
    <footer className="border-t border-gray-300 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Links - Single Line */}
        <div className="flex flex-wrap gap-1.5 items-center mb-4 text-sm leading-tight justify-center">
          {/* 서비스 */}
          <Link href="/pricing" className="text-gray-600 hover:text-cyan-600 transition-colors">
            요금제
          </Link>
          <span className="text-gray-300">|</span>

          <Link href="/dashboard" className="text-gray-600 hover:text-cyan-600 transition-colors">
            대시보드
          </Link>
          <span className="text-gray-300">|</span>

          <Link href="/contact" className="text-gray-600 hover:text-cyan-600 transition-colors">
            고객센터
          </Link>
          <span className="text-gray-300">|</span>

          {/* 회사 */}
          <Link href="/contact" className="text-gray-600 hover:text-cyan-600 transition-colors">
            사업자정보
          </Link>
          <span className="text-gray-300">|</span>

          {/* 정책 */}
          <Link href="/terms" className="text-gray-600 hover:text-cyan-600 transition-colors">
            이용약관
          </Link>
          <span className="text-gray-300">|</span>

          <Link href="/privacy" className="text-gray-600 hover:text-cyan-600 transition-colors">
            개인정보처리방침
          </Link>
          <span className="text-gray-300">|</span>

          <Link href="/refund-policy" className="text-gray-600 hover:text-cyan-600 transition-colors">
            환불정책
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6" />

        {/* Business Information */}
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs mb-4">
            <div>
              <p className="text-gray-500 mb-1">상호</p>
              <p className="text-gray-800">씨너지나노 (SYNERGY NANO)</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">대표자</p>
              <p className="text-gray-800">권오룡</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">사업자등록번호</p>
              <p className="text-gray-800">299-86-03770</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">이메일</p>
              <p className="text-gray-800">sinmok84@hanmil.net</p>
            </div>
          </div>

          <p className="text-gray-600 text-xs leading-relaxed">
            주소: 세종특별자치시 갈매로 363, 405호 |
            <span className="inline-block ml-2">운영시간: 월-금 10:00-18:00 (공휴일 제외)</span>
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4" />

        {/* Bottom Copyright */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-xs text-gray-500">
          <p>© 2025 TikTalk Killa. All rights reserved.</p>
          <p>TikTok, Douyin, Xiaohongshu는 각 회사의 상표입니다.</p>
        </div>
      </div>
    </footer>
  );
}
