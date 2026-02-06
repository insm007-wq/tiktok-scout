"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PricingPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'light',
      name: '라이트',
      price: 19800,
      searches: 20,
      description: '시작하기 좋은 기본 플랜',
      features: [
        '일일 검색 20회',
        '기본 분석 기능',
        '표준 처리 속도',
        '이메일 지원'
      ],
      highlighted: false
    },
    {
      id: 'pro',
      name: '프로',
      price: 29800,
      searches: 40,
      description: '가장 인기있는 플랜',
      features: [
        '일일 검색 40회',
        '고급 분석 기능',
        '우선 처리',
        '우선 이메일 지원',
        '월간 리포트'
      ],
      highlighted: true
    },
    {
      id: 'pro-plus',
      name: '프로+',
      price: 39800,
      searches: 50,
      description: '전문가용 플랜',
      features: [
        '일일 검색 50회',
        '모든 분석 기능',
        '최우선 처리',
        '24시간 우선 지원',
        '월간 리포트 + 인사이트',
        '팀 협업 (3명)'
      ],
      highlighted: false
    },
    {
      id: 'ultra',
      name: '울트라',
      price: 49800,
      searches: -1,
      description: '최고의 모든 기능',
      features: [
        '일일 검색 무제한',
        '모든 분석 기능',
        '최우선 처리',
        '24시간 전담 지원',
        '주간 리포트 + 심화 분석',
        '팀 협업 (무제한)',
        'API 연동 지원'
      ],
      highlighted: false
    }
  ];

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    // 향후 결제 페이지로 이동
    // router.push(`/checkout/${planId}`);
    alert(`${plans.find(p => p.id === planId)?.name} 플랜 구매가 준비 중입니다.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-pink-600/20 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-600/20 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              요금제
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            당신의 필요에 맞는 완벽한 플랜을 선택하세요
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className="relative group rounded-2xl transition-all duration-300 cursor-pointer h-full"
            >
              {/* Card background */}
              <div
                className={`absolute inset-0 rounded-2xl blur-xl transition-all duration-300 ${
                  selectedPlan === plan.id
                    ? 'bg-gradient-to-r from-cyan-500/40 to-pink-500/40 opacity-100'
                    : 'bg-gradient-to-r from-cyan-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100'
                }`}
              />

              {/* Card content */}
              <div
                className={`relative p-8 rounded-2xl border backdrop-blur-md transition-all duration-300 h-full flex flex-col ${
                  selectedPlan === plan.id
                    ? 'border-cyan-400/80 bg-white/15 ring-2 ring-cyan-400/50'
                    : 'border-white/20 bg-white/10 group-hover:border-white/40 group-hover:bg-white/15'
                }`}
              >
                {/* Popular or Selected badge */}
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-cyan-500 to-pink-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                      가장 인기
                    </span>
                  </div>
                )}

                {selectedPlan === plan.id && !plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 text-black px-4 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      선택됨
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-white/60 text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text">
                      ₩{plan.price.toLocaleString()}
                    </span>
                    <span className="text-white/60">/월</span>
                  </div>
                </div>

                {/* Searches */}
                <div className="mb-8 pb-8 border-b border-white/10">
                  <p className="text-white/80">
                    <span className="font-semibold text-cyan-400">
                      {plan.searches === -1 ? '무제한' : `${plan.searches}회`}
                    </span>
                    <span className="text-white/60"> 일일 검색</span>
                  </p>
                </div>

                {/* Features - flex-1 to grow and push button down */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex gap-3 text-white/80 text-sm">
                      <svg
                        className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Subscribe button - stays at bottom */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 mt-auto ${
                    selectedPlan === plan.id
                      ? 'bg-gradient-to-r from-cyan-500 to-pink-400 text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/40'
                  }`}
                >
                  {selectedPlan === plan.id ? '✓ 선택됨' : '구독 시작'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
          <h2 className="text-2xl font-bold text-white mb-8">자주 묻는 질문</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-white font-semibold mb-2">언제든지 요금제를 변경할 수 있나요?</h3>
              <p className="text-white/70">네, 구독 중 언제든지 상위 요금제로 업그레이드할 수 있습니다. 하위 요금제로의 변경은 다음 결제일부터 적용됩니다.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">구독을 취소하려면?</h3>
              <p className="text-white/70">계정 설정에서 언제든지 구독을 취소할 수 있습니다. 취소 후 구독 기간이 종료될 때까지 서비스를 이용할 수 있으며, 다음 결제는 발생하지 않습니다.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">환불이 가능한가요?</h3>
              <p className="text-white/70">구독 시작 후 7일 이내에는 전액 환불이 가능합니다. <a href="/refund-policy" className="text-cyan-400 hover:text-cyan-300">환불정책</a>을 참고하세요.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">자동 갱신은 어떻게 작동하나요?</h3>
              <p className="text-white/70">매월 같은 날짜에 자동으로 결제됩니다. 언제든지 구독을 취소하면 자동 갱신이 중지되며, 다음 결제는 발생하지 않습니다.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <p className="text-white/70 mb-4">궁금한 점이 있으신가요?</p>
          <a
            href="mailto:contact@tiktalk-killa.com"
            className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-pink-400 text-black rounded-lg font-semibold hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all"
          >
            문의하기
          </a>
        </div>
      </div>
    </div>
  );
}
