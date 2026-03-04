'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams?.get('code') || '';
  const message = searchParams?.get('message') || '결제가 취소되었거나 실패했습니다.';

  const isTestPhaseUnsupported =
    code === 'UNSUPPORTED_TEST_PHASE_PAYMENT_METHOD' ||
    (typeof message === 'string' && message.includes('테스트용'));

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl text-red-400">✕</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">결제 실패</h1>
        <p className="text-white/70 mb-2">{message}</p>
        {isTestPhaseUnsupported && (
          <p className="text-cyan-400/90 text-sm mb-4 p-3 bg-cyan-500/10 rounded-lg border border-cyan-400/30">
            💡 테스트 환경에서는 <strong>신용/체크카드</strong>로 결제해 주세요. 페이코·카카오페이 등 일부 간편결제는 테스트 모드에서 지원되지 않습니다.
          </p>
        )}
        {code && <p className="text-white/50 text-sm mb-8">오류 코드: {code}</p>}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/pricing')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-pink-400 text-black rounded-lg font-semibold"
          >
            요금제 다시 보기
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-white/10 text-white border border-white/30 rounded-lg font-medium hover:bg-white/20"
          >
            대시보드
          </button>
        </div>
      </div>
    </div>
  );
}
