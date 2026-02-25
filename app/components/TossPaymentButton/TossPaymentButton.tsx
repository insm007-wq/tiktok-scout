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

  const handlePay = async () => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/pricing');
      return;
    }

    if (status === 'loading' || isLoading) return;
    setIsLoading(true);

    try {
      const createRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.price,
          planName: plan.name,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        if (createRes.status === 503) {
          window.location.href = `/contact?plan=${plan.id}`;
          return;
        }
        alert(createData.error || '주문 생성에 실패했습니다.');
        setIsLoading(false);
        return;
      }

      const { orderId, amount, clientKey } = createData;
      const successUrl = `${window.location.origin}/payments/success`;
      const failUrl = `${window.location.origin}/payments/fail`;

      const customerKey = session?.user?.email
        ? `user-${session.user.email.replace(/[^a-zA-Z0-9._=-]/g, '_')}`
        : `anon-${Date.now()}`;

      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey });

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName: `틱톡킬라 ${plan.name} 플랜 구독`,
        successUrl,
        failUrl,
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
      disabled={disabled || isLoading || status === 'loading'}
      className={className}
    >
      {isLoading || status === 'loading' ? '처리 중...' : children}
    </button>
  );
}
