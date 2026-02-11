"use client";

import Link from "next/link";

const LAST_UPDATED = "2026-02-11";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-pink-600/20 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-600/20 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 md:p-12 text-white space-y-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-bold gradient-text">고객센터 / 사업자 정보</h1>
            <p className="text-white/70 text-sm">최근 수정일: {LAST_UPDATED}</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">1. 고객센터</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 text-white/80">
              <p>
                <strong>문의 이메일:</strong>{" "}
                <a
                  href="mailto:aiyumisejong@gmail.com"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  aiyumisejong@gmail.com
                </a>
              </p>
              <p>
                <strong>운영시간:</strong> 월-금 10:00 ~ 18:00 (공휴일 제외)
              </p>
              <p className="text-white/70 text-sm">
                환불/해지/결제 관련 문의는 이메일로 접수해 주시면 영업일 기준 1-2일 내 회신드립니다.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">2. 사업자 정보</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-white/80 text-sm">
              <div>
                <p className="text-white/60 text-xs mb-1">상호</p>
                <p className="font-semibold">씨너지나노 (SYNERGY NANO)</p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">대표자</p>
                <p className="font-semibold">권오룡</p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">사업자등록번호</p>
                <p className="font-semibold">299-86-03770</p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">주소</p>
                <p className="font-semibold">세종특별자치시 갈매로 363, 405호</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">3. 정책 문서</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-wrap gap-3 text-sm">
              <Link href="/pricing" className="text-white/80 hover:text-cyan-300 underline underline-offset-4">
                요금제/상품 상세
              </Link>
              <Link href="/refund-policy" className="text-white/80 hover:text-cyan-300 underline underline-offset-4">
                환불정책
              </Link>
              <Link href="/terms" className="text-white/80 hover:text-cyan-300 underline underline-offset-4">
                이용약관
              </Link>
              <Link href="/privacy" className="text-white/80 hover:text-cyan-300 underline underline-offset-4">
                개인정보처리방침
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

