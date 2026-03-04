'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string;
  name: string;
  price: number;
}

interface TossPaymentButtonProps {
  plan: Plan;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export default function TossPaymentButton({ plan, children, className, disabled }: TossPaymentButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const hasClientKey = !!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  const handlePay = async () => {
    // 토스 클라이언트 키가 없으면 결제 기능 비활성화
    if (!hasClientKey) {
      alert('온라인 결제 기능이 아직 준비되지 않았습니다. 관리자에게 문의해주세요.');
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/pricing');
      return;
    }

    if (status === 'loading' || isLoading) return;
    setIsLoading(true);

    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        // 타입 안전성을 위해 재검증 (이 경우에도 결제는 진행하지 않음)
        throw new Error('Toss Payments client key is not configured');
      }
      const customerKey = session?.user?.email
        ? `user-${session.user.email.replace(/[^a-zA-Z0-9._=-]/g, '_')}`
        : `anon-${Date.now()}`;

      // 플랜 정보를 billing-success 페이지에서 복구하기 위해 저장
      sessionStorage.setItem('pending_plan', JSON.stringify({
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
      }));

      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey });

      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${window.location.origin}/payments/billing-success`,
        failUrl: `${window.location.origin}/payments/fail`,
        customerEmail: session?.user?.email ?? undefined,
        customerName: session?.user?.name ?? undefined,
      });
    } catch (err) {
      const msg = (err as Error).message ?? '';
      const code = (err as { code?: string })?.code ?? '';
      const isUserCancel =
        msg.includes('취소') ||
        msg.includes('닫은') ||
        msg.includes('닫았') ||
        code.includes('USER_CANCEL') ||
        code.includes('UserCancel');
      if (isUserCancel) return;
      console.error('[TossPayment]', err);
      alert('결제창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={disabled || isLoading || status === 'loading' || !hasClientKey}
      className={className}
    >
      {isLoading || status === 'loading' ? '처리 중...' : children}
    </button>
  );
}
