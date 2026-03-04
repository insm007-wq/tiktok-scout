'use client'

import TossPaymentButton from '@/app/components/TossPaymentButton/TossPaymentButton'

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
}

const isTestMode = typeof process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY === 'string' &&
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY.startsWith('test_')

const PLANS = [
  { id: 'light', name: '라이트', price: 19800, total: 20, description: '시작하기 좋은 기본 플랜' },
  { id: 'pro', name: '프로', price: 29800, total: 40, description: '가장 인기있는 플랜' },
  { id: 'pro-plus', name: '프로+', price: 39800, total: 50, description: '전문가용 플랜' },
  { id: 'ultra', name: '울트라', price: 49800, total: 100, description: '최고의 모든 기능' },
]

export default function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-white">요금제 선택</h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-lg p-4 border border-white/10 bg-white/10 hover:border-white/30 hover:bg-white/15 transition-all cursor-pointer"
            >
              <h4 className="text-lg font-bold text-white mb-2">{plan.name}</h4>
              <p className="text-sm text-white/60 mb-3">{plan.description}</p>
              <div className="mb-4">
                <p className="text-2xl font-bold text-pink-400">₩{plan.price.toLocaleString()}</p>
                <p className="text-xs text-white/60">/월</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-lg p-2.5 mb-4">
                <p className="text-sm text-cyan-400">
                  📊 일일 사용: <span className="font-bold">{plan.total === -1 ? '무제한' : `${plan.total}회`}</span>
                </p>
                <p className="text-xs text-white/60 mt-1">(검색 + 다운로드 + 자막 합산)</p>
              </div>
              <TossPaymentButton
                plan={{ id: plan.id, name: plan.name, price: plan.price }}
                className="w-full py-2 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-cyan-500 to-pink-400 text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
              >
                결제하기
              </TossPaymentButton>
            </div>
          ))}
        </div>

        {isTestMode && (
          <p className="text-cyan-400/80 text-sm text-center mt-4">
            💡 테스트 환경: 결제창에서 <strong>신용/체크카드</strong>를 선택해 주세요. (페이코·카카오페이 등은 테스트 미지원)
          </p>
        )}
      </div>
    </div>
  )
}
