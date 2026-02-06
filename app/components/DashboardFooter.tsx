"use client";

export default function DashboardFooter() {
  return (
    <footer className="border-t border-gray-300 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
        <div className="text-xs text-gray-500 text-center">
          <p>© 2025 TikTalk Killa. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
