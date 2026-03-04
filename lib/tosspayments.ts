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

/**
 * 빌링키 발급 (카드 등록 완료 후 1회)
 * requestBillingAuth 성공 후 authKey + customerKey 로 빌링키 획득
 */
export async function issueBillingKey(authKey: string, customerKey: string) {
  const secret = getTossSecretKey();
  const res = await fetch(`${TOSS_API_BASE}/billing/authorizations/${authKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(secret + ':').toString('base64')}`,
    },
    body: JSON.stringify({ customerKey }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `빌링키 발급 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 빌링키로 결제 실행 (최초 + 매월 갱신 공통)
 */
export async function chargeBillingKey(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail: string;
  customerName?: string;
}) {
  const secret = getTossSecretKey();
  const res = await fetch(`${TOSS_API_BASE}/billing/${params.billingKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(secret + ':').toString('base64')}`,
    },
    body: JSON.stringify({
      customerKey: params.customerKey,
      amount: params.amount,
      orderId: params.orderId,
      orderName: params.orderName,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `빌링 결제 실패: ${res.status}`);
  }

  return res.json();
}
