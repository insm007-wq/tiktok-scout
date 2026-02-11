"use client";

const LAST_UPDATED = "2026-02-11";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-pink-600/20 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-600/20 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Main content */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 md:p-12 text-white space-y-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-4">서비스 이용약관</h1>
            <p className="text-white/70">최근 수정일: {LAST_UPDATED}</p>
          </div>

          {/* 1. 총칙 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">1. 총칙</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <div>
                <p className="font-semibold text-white mb-1">1-1 회사 정보</p>
                <div className="text-white/80 leading-relaxed ml-4 space-y-1 text-sm">
                  <p>
                    <strong>상호:</strong> 씨너지나노 (SYNERGY NANO)
                  </p>
                  <p>
                    <strong>사업자등록번호:</strong> 299-86-03770
                  </p>
                  <p>
                    <strong>대표자:</strong> 권오룡
                  </p>
                  <p>
                    <strong>주소:</strong> 세종특별자치시 갈매로 363, 405호
                  </p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">1-2 목적</p>
                <p className="text-white/80 leading-relaxed ml-4">
                  본 약관은 씨너지나노(이하 "회사")의 틱톡킬라 서비스(이하 "서비스")의 이용에 관하여 필요한 사항을 규정하는 것을 목적으로
                  합니다.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">1-3 정의</p>
                <div className="text-white/80 ml-4 space-y-1">
                  <p>
                    <strong>"서비스":</strong> TikTok, Douyin, 샤오홍슈 등 동영상 플랫폼의 영상 검색 및 분석 기능
                  </p>
                  <p>
                    <strong>"이용자":</strong> 본 약관에 동의하고 서비스를 이용하는 개인
                  </p>
                  <p>
                    <strong>"계정":</strong> 이용자 식별을 위한 이메일, 비밀번호 등의 정보
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. 서비스 이용 조건 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">2. 서비스 이용 조건</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <div>
                <p className="font-semibold text-white mb-1">2-1 가입 자격</p>
                <p className="text-white/80 leading-relaxed ml-4">
                  만 18세 이상의 개인만 가입할 수 있습니다. 초대 코드는 회사에서 승인한 이용자에게만 제공됩니다.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">2-2 계정 보안</p>
                <p className="text-white/80 leading-relaxed ml-4">
                  이용자는 계정 정보를 안전하게 보관할 책임이 있으며, 제3자와 공유하거나 양도할 수 없습니다.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">2-3 비밀번호</p>
                <p className="text-white/80 leading-relaxed ml-4">
                  이용자는 강력한 비밀번호를 설정하고 주기적으로 변경할 것을 권장합니다. 비밀번호로 인한 보안 문제는 이용자의 책임입니다.
                </p>
              </div>
            </div>
          </section>

          {/* 3. 이용자의 의무 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">3. 이용자의 의무</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80 leading-relaxed">이용자는 다음의 행위를 하여서는 안 됩니다:</p>
              <ul className="space-y-2 text-white/80 ml-4">
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>타인의 계정 무단 사용</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>서비스의 무단 복제, 배포, 전송</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>시스템 해킹 또는 부정한 접근 시도</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>불법적인 목적의 서비스 이용</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>타인의 저작권 및 개인정보 침해</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>스팸, 악성 코드 배포</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 4. 서비스 제공자의 권리 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">4. 서비스 제공자의 권리</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <div>
                <p className="font-semibold text-white mb-1">4-1 서비스 변경</p>
                <p className="text-white/80 leading-relaxed ml-4">
                  회사는 서비스를 개선하기 위해 언제든지 기능을 변경하거나 추가할 수 있습니다. 중요한 변경의 경우 7일 전에 공지합니다.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">4-2 이용 제한</p>
                <p className="text-white/80 leading-relaxed ml-4">
                  회사는 약관 위반 시 이용자의 계정 사용을 제한하거나 탈퇴 조치할 수 있습니다.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">4-3 저작권</p>
                <p className="text-white/80 leading-relaxed ml-4">
                  서비스의 모든 콘텐츠, 디자인, 코드는 회사의 저작물이거나 정당한 라이선스를 가진 것입니다.
                </p>
              </div>
            </div>
          </section>

          {/* 5. 서비스 중단 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">5. 서비스 중단 및 변경</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <div>
                <p className="font-semibold text-white mb-1">5-1 정기 점검</p>
                <p className="text-white/80 leading-relaxed ml-4">
                  회사는 서비스 유지보수를 위해 정기적으로 점검할 수 있으며, 사전에 공지합니다.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">5-2 긴급 중단</p>
                <p className="text-white/80 leading-relaxed ml-4">
                  보안 침해, 기술적 장애 등으로 긴급 중단이 필요한 경우 사전 공지 없이 중단할 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 6. 면책 조항 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">6. 면책 조항</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80 leading-relaxed">회사는 다음의 경우 책임을 지지 않습니다:</p>
              <ul className="space-y-2 text-white/80 ml-4">
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>이용자의 과실로 인한 손해</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>외부 API(Apify, Bright Data 등) 장애로 인한 서비스 중단</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>예측 불가능한 자연재해, 정부 조치 등</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>제3자의 저작권 침해 관련 문제</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 7. 지적재산권 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">7. 지적재산권</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80 leading-relaxed">
                서비스를 통해 검색한 영상 콘텐츠는 원저작권자의 소유입니다. 회사는 메타데이터 수집만 제공하며, 영상 저작권에 대한 책임을
                지지 않습니다.
              </p>
              <p className="text-white/80 leading-relaxed">
                이용자는 검색 결과를 개인 학습 목적으로만 사용할 수 있으며, 상업적 용도로 사용할 수 없습니다.
              </p>
            </div>
          </section>

          {/* 8. 결제 및 환불 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">8. 결제 및 환불</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80 leading-relaxed">
                구독 서비스의 결제·환불 조건은 별도 환불정책에 따릅니다. 구독 시작 후 <strong>3일 이내</strong> 전액 환불 가능하며, 상세 내용은{" "}
                <a href="/refund-policy" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4">환불정책</a>을 참고하시기 바랍니다.
              </p>
            </div>
          </section>

          {/* 9. 이용 제한 및 계정 정지 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">9. 이용 제한 및 계정 정지</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80 leading-relaxed">회사는 다음의 경우 계정 사용을 제한하거나 탈퇴 조치할 수 있습니다:</p>
              <ul className="space-y-2 text-white/80 ml-4">
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>본 약관 위반</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>불법 행위</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>타인 명의 도용</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>시스템 해킹 시도</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 10. 회원 탈퇴 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">10. 회원 탈퇴</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80 leading-relaxed">
                이용자는 언제든지 계정 설정에서 회원 탈퇴를 신청할 수 있습니다. 탈퇴 후 14일 동안 개인정보는 보관되며 이후 완전히
                삭제됩니다.
              </p>
              <p className="text-white/80 leading-relaxed">탈퇴 후 14일이 경과하기 전에는 같은 이메일로 재가입할 수 없습니다.</p>
            </div>
          </section>

          {/* 11. 분쟁 해결 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">11. 분쟁 해결</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80 leading-relaxed">
                본 약관과 관련된 분쟁이 발생하는 경우 회사와 이용자 간의 협의를 통해 해결하며, 합의가 이루어지지 않을 경우 관할 법원에
                제소할 수 있습니다.
              </p>
            </div>
          </section>

          {/* 12. 준거법 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">12. 준거법</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80 leading-relaxed">
                본 약관은 대한민국 법률에 따라 해석 및 적용되며, 모든 분쟁은 대한민국 법원의 관할에 따릅니다.
              </p>
            </div>
          </section>

          {/* 13. 약관 변경 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-pink-400">13. 약관 변경</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80 leading-relaxed">
                회사는 필요에 따라 본 약관을 변경할 수 있으며, 변경 시 최소 7일 전에 공지합니다. 변경된 약관은 공지일부터 효력이 발생합니다.
              </p>
            </div>
          </section>

          {/* 동의 섹션 */}
          <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg p-4 mt-8">
            <p className="text-white text-center">본 서비스 이용약관에 동의하시고 서비스를 이용하시게 됩니다.</p>
          </div>

          {/* 동의하고 창 닫기 버튼 */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => window.close()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-pink-400 text-black rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all font-semibold"
            >
              동의하고 계속하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
