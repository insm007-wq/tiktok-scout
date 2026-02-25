/**
 * 토스페이먼츠 서버 유틸
 * - 결제 승인 API 호출
 * - 환경변수 검증
 */

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

export function getTossClientKey(): string {
  const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY is not set');
  }
  return key;
}

export function getTossSecretKey(): string {
  const key = process.env.TOSS_CLIENT_SECRET;
  if (!key) {
    throw new Error('TOSS_CLIENT_SECRET is not set');
  }
  return key;
}

export function isTossConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY &&
    process.env.TOSS_CLIENT_SECRET
  );
}

/**
 * 결제 승인 (Confirm Payment)
 * 결제창 완료 후 paymentKey, orderId, amount 로 승인 요청
 */
export async function confirmPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  const secret = getTossSecretKey();
  const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(secret + ':').toString('base64')}`,
    },
    body: JSON.stringify({
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      amount: params.amount,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `결제 승인 실패: ${res.status}`);
  }

  return res.json();
}
