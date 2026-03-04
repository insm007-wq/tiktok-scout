'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const authKey = searchParams?.get('authKey') || '';
    const customerKey = searchParams?.get('customerKey') || '';

    if (!authKey || !customerKey) {
      setStatus('error');
      setErrorMessage('결제 정보가 올바르지 않습니다.');
      return;
    }

    let planId = '';
    let planName = '';
    let amount = 0;

    try {
      const pending = sessionStorage.getItem('pending_plan');
      if (pending) {
        const parsed = JSON.parse(pending);
        planId = parsed.planId;
        planName = parsed.planName;
        amount = parsed.amount;
        sessionStorage.removeItem('pending_plan');
      }
    } catch {
      // sessionStorage 파싱 실패 무시
    }

    if (!planId || !amount) {
      setStatus('error');
      setErrorMessage('플랜 정보를 찾을 수 없습니다. 다시 시도해 주세요.');
      return;
    }

    fetch('/api/payments/billing-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, customerKey, planId, planName, amount }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(data.error || '결제 처리에 실패했습니다.');
        }
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err.message || '결제 승인 중 오류가 발생했습니다.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-white/80 text-lg">결제를 처리하고 있습니다...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✓</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">결제가 완료되었습니다</h1>
            <p className="text-white/70 mb-8">구독이 정상적으로 활성화되었습니다.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-pink-400 text-black rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              대시보드로 이동
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-red-400">✕</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">결제 처리 실패</h1>
            <p className="text-white/70 mb-8">{errorMessage}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/pricing')}
                className="px-6 py-3 bg-white/10 text-white border border-white/30 rounded-lg font-medium hover:bg-white/20"
              >
                요금제 다시 보기
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-pink-400 text-black rounded-lg font-semibold"
              >
                대시보드
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
