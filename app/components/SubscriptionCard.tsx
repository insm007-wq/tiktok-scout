"use client";

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";

interface SubscriptionCardProps {
  userEmail?: string;
  currentPlan?: "light" | "pro" | "pro-plus" | "ultra" | null;
  nextBillingDate?: string | null;
}

export default function SubscriptionCard({
  userEmail,
  currentPlan,
  nextBillingDate,
}: SubscriptionCardProps) {
  const [showPlans, setShowPlans] = useState(false);
  const [toast, setToast] = useState<string>("");

  // 페이지 로드 시 토스트 표시
  useEffect(() => {
    if (!currentPlan) {
      setToast("구독이 되지 않았습니다.");
      const timer = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentPlan]);

  const plans = [
    {
      id: "light",
      name: "라이트",
      price: 19800,
      total: 20,
      description: "시작하기 좋은 기본 플랜",
    },
    {
      id: "pro",
      name: "프로",
      price: 29800,
      total: 40,
      description: "가장 인기있는 플랜",
    },
    {
      id: "pro-plus",
      name: "프로+",
      price: 39800,
      total: 50,
      description: "전문가용 플랜",
    },
    {
      id: "ultra",
      name: "울트라",
      price: 49800,
      total: 100,
      description: "최고의 모든 기능",
    },
  ];

  const getPlanName = (planId: string | undefined) => {
    if (!planId) return null;
    const plan = plans.find((p) => p.id === planId);
    return plan?.name;
  };

  const handleSubscribe = () => {
    setToast("구독이 되지 않았습니다.");
    setTimeout(() => setToast(""), 3000);
  };

  return (
    <div className="mb-8">
      {/* 토스트 알람 */}
      {toast && (
        <div className="fixed top-4 right-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex gap-3 z-40 animate-in fade-in slide-in-from-top">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 font-medium">{toast}</p>
        </div>
      )}

      {currentPlan ? (
        // 구독 중인 경우
        <div className="bg-gradient-to-r from-cyan-500/10 to-pink-500/10 border border-cyan-400/30 rounded-2xl p-6 md:p-8 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-3">
                {getPlanName(currentPlan)} 구독 중 ✓
              </h2>
              <div className="space-y-2 text-sm text-white/70 mb-4">
                <p>📧 {userEmail}</p>
                {nextBillingDate && <p>📅 다음 결제일: {nextBillingDate}</p>}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
                <p className="text-xs text-white/60 mb-2 font-semibold">일일 사용 한도</p>
                {plans.find(p => p.id === currentPlan) && (
                  <p className="text-sm text-cyan-400">
                    검색 + 다운로드 + 자막 <span className="font-bold">{plans.find(p => p.id === currentPlan)?.total === -1 ? "무제한" : `${plans.find(p => p.id === currentPlan)?.total}회`}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 md:flex-col">
              <button
                onClick={() => setShowPlans(true)}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-pink-400 text-black rounded-lg font-semibold hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all whitespace-nowrap"
              >
                플랜 변경
              </button>
              <button className="px-6 py-2 bg-white/10 text-white border border-white/20 rounded-lg font-semibold hover:bg-white/20 transition-all whitespace-nowrap">
                구독 취소
              </button>
            </div>
          </div>
        </div>
      ) : (
        // 구독 없는 경우
        <div className="bg-gradient-to-r from-cyan-500/10 to-pink-500/10 border border-cyan-400/30 rounded-2xl p-6 md:p-8 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                아직 구독 중이 아닙니다
              </h2>
              <p className="text-white/70">
                구독 플랜을 선택하고 무제한으로 사용하세요!
              </p>
            </div>
            <button
              onClick={() => setShowPlans(true)}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-pink-400 text-black rounded-lg font-semibold hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all whitespace-nowrap"
            >
              구독하기
            </button>
          </div>
        </div>
      )}

      {/* 요금제 선택 모달 */}
      {showPlans && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-zinc-900 to-black border border-white/10 rounded-2xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-white">요금제 선택</h3>
              <button
                onClick={() => setShowPlans(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* 요금제 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-lg p-4 border transition-all cursor-pointer ${
                    currentPlan === plan.id
                      ? "border-cyan-400/80 bg-white/15"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <h4 className="text-lg font-bold text-white mb-2">
                    {plan.name}
                  </h4>
                  <p className="text-sm text-white/60 mb-3">{plan.description}</p>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-cyan-400">
                      ₩{plan.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/60">/월</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 mb-4">
                    <p className="text-sm text-cyan-400">
                      📊 일일 사용:{" "}
                      <span className="font-bold">
                        {plan.total === -1 ? "무제한" : `${plan.total}회`}
                      </span>
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      (검색 + 다운로드 + 자막 합산)
                    </p>
                  </div>
                  <button
                    onClick={handleSubscribe}
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
                      currentPlan === plan.id
                        ? "bg-gradient-to-r from-cyan-500 to-pink-400 text-black"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {currentPlan === plan.id ? "현재 플랜" : "선택"}
                  </button>
                </div>
              ))}
            </div>

            {/* 안내 메시지 */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/70">
              <p>
                💳 결제 기능은 준비 중입니다. 곧 토스 페이먼츠를 통해 결제 가능하게 됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
