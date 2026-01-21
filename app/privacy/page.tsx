'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-pink-600/20 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-600/20 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            뒤로가기
          </Link>
        </div>

        {/* Main content */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 md:p-12 text-white space-y-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-4">개인정보 처리방침</h1>
            <p className="text-white/70">최근 수정일: {new Date().toLocaleDateString('ko-KR')}</p>
          </div>

          {/* 1. 개인정보 수집 항목 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">1. 수집하는 개인정보 항목</h2>
            <p className="text-white/80 leading-relaxed">
              틱톡 킬라(이하 "회사")는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-white">필수 항목:</p>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                <li>이메일, 이름, 핸드폰 번호</li>
                <li>비밀번호 (암호화되어 저장)</li>
                <li>초대 코드 (접근 제어용)</li>
              </ul>
              <p className="font-semibold text-white mt-4">선택 항목:</p>
              <ul className="list-disc list-inside space-y-1 text-white/80 ml-2">
                <li>우편번호, 주소, 상세주소 (교재 수령 희망 시)</li>
                <li>마케팅 활용 동의 여부</li>
              </ul>
            </div>
          </section>

          {/* 2. 수집 및 이용 목적 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">2. 수집 및 이용 목적</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <ul className="space-y-2 text-white/80">
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>회원 관리:</strong> 회원 가입 및 본인 확인, 회원 제공 서비스 계약 이행 및 청구</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>서비스 제공:</strong> 동영상 검색, 분석 기능 등 플랫폼 서비스 제공</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>교재 배송 (선택):</strong> 무료 교재 우편 배송</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>마케팅 활용 (동의 시):</strong> 이벤트, 프로모션 정보 제공</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>서비스 개선:</strong> 이용 통계, 서비스 이용 패턴 분석</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 3. 제3자 제공 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">3. 제3자 제공</h2>
            <p className="text-white/80 leading-relaxed">
              회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 아래의 경우에는 예외적으로 제공할 수 있습니다.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <ul className="space-y-2 text-white/80">
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>Apify & Bright Data:</strong> 데이터 수집 API 제공자 (TikTok, Douyin, Xiaohongshu 영상 메타데이터 수집)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>법적 요청:</strong> 법률에 의해 요구되는 경우</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>동의:</strong> 이용자의 명시적 동의가 있는 경우</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 4. 보유 및 이용 기간 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">4. 보유 및 이용 기간</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <div>
                <p className="font-semibold text-white mb-2">일반 원칙: 목적 달성 후 즉시 삭제</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">계정 탈퇴 시:</p>
                <p className="text-white/80 ml-4">
                  탈퇴 신청 후 14일 동안 보관 후 자동 삭제 (재가입 방지 목적)
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">로그 데이터:</p>
                <p className="text-white/80 ml-4">
                  3개월 보관 후 자동 삭제
                </p>
              </div>
            </div>
          </section>

          {/* 5. 개인정보 보안 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">5. 개인정보 보안 조치</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <ul className="space-y-2 text-white/80">
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>암호화:</strong> 비밀번호는 bcryptjs를 사용하여 암호화 저장</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>접근 제어:</strong> 권한 있는 직원만 접근 가능</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>안전한 전송:</strong> HTTPS SSL/TLS 암호화 전송</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>로그 관리:</strong> 민감한 정보(이메일 등) 로깅 금지</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 6. 이용자 권리 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">6. 이용자의 권리</h2>
            <p className="text-white/80 leading-relaxed">
              이용자는 다음의 권리를 행사할 수 있습니다.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <ul className="space-y-2 text-white/80">
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>열람권:</strong> 자신의 개인정보 열람 요청</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>정정권:</strong> 부정확한 정보 수정 요청</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>삭제권:</strong> 개인정보 삭제 요청 (계정 탈퇴)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>처리정지권:</strong> 정보 처리 정지 요청</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span><strong>동의 철회:</strong> 마케팅 동의 철회 및 수정</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 7. 개인정보 처리방침 변경 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">7. 처리방침 변경</h2>
            <p className="text-white/80 leading-relaxed">
              이 개인정보 처리방침은 관련 법령의 변경이나 회사의 정책에 따라 변경될 수 있으며, 변경 시 최소 7일 전에 홈페이지를 통해 공지합니다. 변경된 사항은 공지한 날부터 효력이 발생합니다.
            </p>
          </section>

          {/* 8. 회사 정보 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">8. 회사 정보</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-white/80"><strong className="text-white">상호명:</strong> 씨너지나노 (SYNERGY NANO)</p>
              </div>
              <div>
                <p className="text-white/80"><strong className="text-white">사업자등록번호:</strong> 299-86-03770</p>
              </div>
              <div>
                <p className="text-white/80"><strong className="text-white">대표자:</strong> 권오룡</p>
              </div>
              <div>
                <p className="text-white/80"><strong className="text-white">주소:</strong> 세종특별자치시 갈매로 363, 405호</p>
              </div>
            </div>
          </section>

          {/* 9. 개인정보 보호책임자 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">9. 개인정보 보호책임자</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80">
                개인정보 처리와 관련한 문의 사항이 있으신 경우 아래로 연락 주시기 바랍니다.
              </p>
              <div className="mt-4 space-y-1 text-white/70 text-sm">
                <p><strong className="text-white">담당자:</strong> 개인정보 보호책임자</p>
                <p><strong className="text-white">이메일:</strong> aiyumisejong@gmail.com</p>
              </div>
            </div>
          </section>

          {/* 10. 법적 근거 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">10. 관련 법령</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <ul className="space-y-1 text-white/80 text-sm">
                <li>• 개인정보보호법 (개인정보보호법, 제15조, 제22조, 제30조)</li>
                <li>• 정보통신망 이용촉진 및 정보보호 등에 관한 법률 (제27조의2)</li>
                <li>• 전자상거래 등에서의 소비자보호에 관한 법률</li>
              </ul>
            </div>
          </section>

          {/* 동의 섹션 */}
          <div className="bg-pink-500/20 border border-pink-500/50 rounded-lg p-4 mt-8">
            <p className="text-white text-center">
              본 개인정보 처리방침에 동의하시고 서비스를 이용하시게 됩니다.
            </p>
          </div>

          {/* 동의하고 창 닫기 버튼 */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => window.close()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-cyan-400 text-black rounded-lg hover:shadow-[0_0_20px_rgba(254,44,85,0.5)] transition-all font-semibold"
            >
              동의하고 계속하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
