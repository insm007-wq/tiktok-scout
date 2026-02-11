"use client";

const LAST_UPDATED = "2026-02-11";
const SUPPORT_EMAIL = "aiyumisejong@gmail.com";

export default function RefundPolicyPage() {
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
            <h1 className="text-4xl font-bold gradient-text mb-4">환불정책</h1>
            <p className="text-white/70">최근 수정일: {LAST_UPDATED}</p>
          </div>

          {/* 1. 기본 원칙 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">1. 기본 원칙</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <p className="text-white/80 leading-relaxed">
                씨너지나노(이하 &quot;회사&quot;)는 TikTalk Killa(이하 &quot;서비스&quot;) 이용자의 권리를 보호하기 위해 다음과 같은 환불정책을 시행합니다.
                본 정책은 월간 구독형 디지털 서비스의 특성을 고려하여 수립되었습니다.
              </p>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                <p className="text-white font-semibold mb-2">📌 구독 서비스 특성 안내</p>
                <p className="text-white/80 text-sm">
                  본 서비스는 월간 구독형 디지털 서비스입니다. 서비스 특성상 구독 시작 후
                  일정 기간이 경과한 경우 환불이 제한될 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 2. 환불 가능 기간 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">2. 환불 가능 기간</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
              <div className="border-l-4 border-cyan-400 pl-4">
                <h3 className="font-semibold text-white mb-2">✅ 전액 환불 가능</h3>
                <p className="text-white/80">
                  <strong>구독 시작 후 7일 이내</strong>에 환불 신청 시 결제한 구독료를 전액 환불받을 수 있습니다.
                </p>
              </div>

              <div className="border-l-4 border-pink-400 pl-4">
                <h3 className="font-semibold text-white mb-2">❌ 환불 불가</h3>
                <p className="text-white/80">
                  <strong>구독 시작 후 8일 이상</strong> 경과한 경우 환불이 불가능합니다.
                  대신 언제든지 구독을 취소하면 다음 결제가 발생하지 않습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 3. 환불 신청 방법 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">3. 환불 신청 방법</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <div>
                <p className="font-semibold text-white mb-3">다음의 방법으로 환불을 신청할 수 있습니다:</p>
                <ol className="space-y-2 text-white/80 ml-4">
                  <li className="flex gap-3">
                    <span className="text-cyan-400 font-bold flex-shrink-0">1</span>
                    <span><strong>이메일 신청:</strong> {SUPPORT_EMAIL}로 &quot;환불 신청&quot;이라는 제목으로 이메일 발송</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyan-400 font-bold flex-shrink-0">2</span>
                    <span><strong>고객센터:</strong> <a href="/contact" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4">고객센터 페이지</a> 안내에 따라 접수</span>
                  </li>
                </ol>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-3">
                <p className="text-white/80 text-sm">
                  💡 <strong>팁:</strong> 환불 신청 시에는 계정 이메일, 구독 날짜, 사유 등을 포함해 주시면
                  빠른 처리에 도움이 됩니다.
                </p>
              </div>
            </div>
          </section>

          {/* 4. 환불 처리 기간 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">4. 환불 처리 기간</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <p className="text-white/80 leading-relaxed">
                환불 신청이 접수된 후 다음과 같은 기간에 처리됩니다:
              </p>
              <ul className="space-y-2 text-white/80 ml-4">
                <li className="flex gap-3">
                  <span className="text-cyan-400">•</span>
                  <span><strong>신청 접수:</strong> 1-2 영업일 이내 확인</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400">•</span>
                  <span><strong>환불 처리:</strong> 신청 확인 후 3-5 영업일 이내 결제 수단으로 환불</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400">•</span>
                  <span><strong>은행 입금:</strong> 각 금융기관의 처리 기간은 1-3일이 소요될 수 있습니다</span>
                </li>
              </ul>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3">
                <p className="text-white/80 text-sm">
                  ⏱️ <strong>주의:</strong> 주말, 공휴일, 금융기관의 영업일이 아닐 경우 처리가 지연될 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 5. 환불 불가 경우 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">5. 환불이 불가능한 경우</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80 leading-relaxed mb-3">
                다음의 경우에는 환불이 불가능합니다:
              </p>
              <ul className="space-y-2 text-white/80 ml-4">
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>구독 시작 후 7일을 초과한 경우</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>서비스 이용약관을 위반하여 계정이 정지된 경우</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>부정한 수단으로 결제를 시도한 경우</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>중복 결제로 인한 환불은 한 건만 처리 가능</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-400">•</span>
                  <span>이미 환불 완료된 건에 대한 재환불 신청</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 6. 자동 갱신 안내 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">6. 자동 갱신 안내</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <div>
                <p className="font-semibold text-white mb-2">📋 자동 갱신 특징</p>
                <ul className="space-y-2 text-white/80 ml-4">
                  <li className="flex gap-3">
                    <span className="text-cyan-400">•</span>
                    <span>구독료는 매월 자동으로 갱신됩니다</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyan-400">•</span>
                    <span>구독한 날짜와 동일한 매월 같은 날짜에 결제됩니다</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyan-400">•</span>
                    <span>구독 해지 전까지 자동으로 갱신됩니다</span>
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-white mb-2">🔐 구독 해지 방법</p>
                <ol className="space-y-2 text-white/80 ml-4">
                  <li className="flex gap-3">
                    <span className="text-cyan-400 font-bold">1</span>
                    <span>로그인 후 마이페이지 → 구독 관리 접속</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyan-400 font-bold">2</span>
                    <span>"구독 해지" 버튼 클릭</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyan-400 font-bold">3</span>
                    <span>해지 사유 입력 후 "해지하기" 클릭</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyan-400 font-bold">4</span>
                    <span>다음 결제가 발생하지 않습니다</span>
                  </li>
                </ol>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-3">
                <p className="text-white/80 text-sm">
                  ✨ <strong>혜택:</strong> 구독 해지 후에도 현재 구독 기간이 종료될 때까지 서비스를 이용할 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 7. 결제 수단별 환불 안내 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">7. 결제 수단별 환불 안내</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <div>
                <p className="font-semibold text-white mb-3 text-cyan-400">💳 신용카드 / 체크카드</p>
                <p className="text-white/80 ml-4">
                  환불액이 원래 결제하신 카드로 반환됩니다. 카드사별로 1-3일 정도의 처리 기간이 필요할 수 있습니다.
                </p>
              </div>

              <div>
                <p className="font-semibold text-white mb-3 text-cyan-400">🏦 계좌이체</p>
                <p className="text-white/80 ml-4">
                  환불액이 원래 결제하신 계좌로 반환됩니다. 금융기관 처리 시간은 1-2 영업일이 소요됩니다.
                </p>
              </div>

              <div>
                <p className="font-semibold text-white mb-3 text-cyan-400">💰 가상계좌</p>
                <p className="text-white/80 ml-4">
                  환불액이 입금한 계좌로 반환됩니다. 은행별로 1-3 영업일이 소요될 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 8. 분쟁 해결 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">8. 분쟁 해결 및 문의</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <p className="text-white/80 leading-relaxed">
                환불 정책과 관련하여 분쟁이 발생하는 경우, 회사와 고객 간의 협의를 통해 해결하며,
                합의가 이루어지지 않을 경우 대한민국 법률에 따라 처리됩니다.
              </p>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-3">
                <p className="font-semibold text-white mb-3">📞 문의 및 환불 신청</p>
                <ul className="space-y-2 text-white/80">
                  <li className="flex gap-3">
                    <span className="text-cyan-400">•</span>
                    <span><strong>이메일:</strong> {SUPPORT_EMAIL}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyan-400">•</span>
                    <span><strong>운영시간:</strong> 월-금 10:00 ~ 18:00 (공휴일 제외)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-cyan-400">•</span>
                    <span><strong>응답시간:</strong> 영업일 기준 24시간 이내</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 9. 정책 변경 */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-cyan-400">9. 정책 변경</h2>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-white/80 leading-relaxed">
                회사는 필요에 따라 본 환불정책을 변경할 수 있으며, 변경 시 최소 7일 전에 공지합니다.
                변경된 정책은 공지일부터 효력이 발생합니다.
              </p>
            </div>
          </section>

          {/* CTA */}
          <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg p-6 mt-8 text-center">
            <p className="text-white mb-4">추가 질문이 있으신가요?</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-block px-6 py-2 bg-gradient-to-r from-cyan-500 to-pink-400 text-black rounded-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all font-semibold"
            >
              문의하기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
