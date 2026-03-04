import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { issueBillingKey, chargeBillingKey, isTossConfigured } from '@/lib/tosspayments';
import { sendBillingSuccessEmail } from '@/lib/email';
import { ObjectId } from 'mongodb';

const PLAN_PRICES: Record<string, number> = {
  light: 19800,
  pro: 29800,
  'pro-plus': 39800,
  ultra: 49800,
};

const PLAN_LIMITS: Record<string, number> = {
  light: 20,
  pro: 40,
  'pro-plus': 50,
  ultra: 100,
};

/**
 * 빌링키 발급 + 즉시 첫 결제 + DB 저장
 * POST /api/payments/billing-auth
 * Body: { authKey, customerKey, planId, planName, amount }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    if (!isTossConfigured()) {
      return NextResponse.json(
        { error: '결제 시스템이 준비되지 않았습니다.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { authKey, customerKey, planId, planName, amount } = body;

    if (!authKey || !customerKey || !planId || amount == null) {
      return NextResponse.json({ error: '결제 정보가 올바르지 않습니다.' }, { status: 400 });
    }

    const validPlans = ['light', 'pro', 'pro-plus', 'ultra'];
    if (!validPlans.includes(planId)) {
      return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 });
    }

    // 서버에서 금액 재검증 (클라이언트 변조 방지)
    const expectedAmount = PLAN_PRICES[planId];
    if (expectedAmount === undefined || Number(amount) !== expectedAmount) {
      return NextResponse.json({ error: '결제 금액이 플랜과 일치하지 않습니다.' }, { status: 400 });
    }

    // 빌링키 발급
    const billingResult = await issueBillingKey(authKey, customerKey);
    const billingKey = billingResult.billingKey;

    if (!billingKey) {
      return NextResponse.json({ error: '빌링키 발급에 실패했습니다.' }, { status: 500 });
    }

    // 즉시 첫 결제 실행
    const orderId = `tiktalk-${new ObjectId().toString()}-${Date.now()}`;
    const paymentResult = await chargeBillingKey({
      billingKey,
      customerKey,
      amount: expectedAmount,
      orderId,
      orderName: `틱톡킬라 ${planName || planId} 플랜 구독`,
      customerEmail: session.user.email,
      customerName: session.user.name ?? undefined,
    });

    const { db } = await connectToDatabase();
    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    // payment_orders 저장
    await db.collection('payment_orders').insertOne({
      orderId,
      email: session.user.email,
      planId,
      planName: planName || planId,
      amount: expectedAmount,
      status: 'PAID',
      type: 'billing_initial',
      billingKey,
      paymentKey: paymentResult.paymentKey,
      paidAt: now,
      tossResponse: paymentResult,
      createdAt: now,
    });

    // subscriptions upsert (빌링키 + 카드 정보 포함)
    const cardInfo = billingResult.card
      ? {
          company: billingResult.card.company,
          last4: billingResult.card.number?.slice(-4),
          method: billingResult.method,
        }
      : null;

    await db.collection('subscriptions').updateOne(
      { email: session.user.email },
      {
        $set: {
          email: session.user.email,
          planId,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: nextBillingDate,
          lastPaymentAt: now,
          billingKey,
          customerKey,
          cardInfo,
          paymentFailCount: 0,
          lastPaymentFailedAt: null,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    // users dailyLimit 업데이트
    const newLimit = PLAN_LIMITS[planId] ?? 20;
    const todayStr = now.toISOString().split('T')[0];

    await db.collection('users').updateOne(
      { email: session.user.email },
      {
        $set: {
          dailyLimit: newLimit,
          remainingLimit: newLimit,
          updatedAt: now,
          lastActive: now,
        },
        $setOnInsert: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
          provider: 'payment',
          providerId: planId,
          todayUsed: 0,
          lastResetDate: todayStr,
          isActive: true,
          isBanned: false,
          isOnline: false,
          lastLogin: now,
          createdAt: now,
          isAdmin: false,
          isApproved: true,
        },
      },
      { upsert: true }
    );

    // 최초 결제 성공 이메일 발송
    try {
      await sendBillingSuccessEmail(session.user.email, {
        planName: planName || planId,
        amount: expectedAmount,
        periodEnd: nextBillingDate.toISOString().split('T')[0],
        isRenewal: false,
      });
    } catch (emailErr) {
      console.error('[Payments billing-auth] 이메일 발송 실패:', emailErr);
    }

    return NextResponse.json({
      success: true,
      planId,
      orderId: paymentResult.orderId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.';
    console.error('[Payments billing-auth] error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
