import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { confirmPayment, isTossConfigured } from '@/lib/tosspayments';

/**
 * 결제 승인
 * - 결제창 완료 후 success redirect 시 호출
 * - paymentKey, orderId, amount 로 토스페이먼츠 승인 API 호출
 * - 성공 시 구독 정보 DB 저장
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
    const { paymentKey, orderId, amount } = body;

    if (!paymentKey || !orderId || amount == null) {
      return NextResponse.json({ error: '결제 정보가 올바르지 않습니다.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    let order = await db.collection('payment_orders').findOne({
      orderId,
      email: session.user.email,
      status: 'PENDING',
    });

    // 이미 처리된 주문(PAID)이면 idempotent로 성공 반환 (새로고침 대응)
    if (!order) {
      const paidOrder = await db.collection('payment_orders').findOne({
        orderId,
        email: session.user.email,
        status: 'PAID',
      });
      if (paidOrder) {
        return NextResponse.json({
          success: true,
          planId: paidOrder.planId,
          paymentKey: paidOrder.paymentKey,
          orderId: paidOrder.orderId,
        });
      }
      return NextResponse.json({ error: '주문을 찾을 수 없거나 이미 처리되었습니다.' }, { status: 404 });
    }

    if (order.amount !== Number(amount)) {
      return NextResponse.json({ error: '결제 금액이 일치하지 않습니다.' }, { status: 400 });
    }

    const paymentResult = await confirmPayment({
      paymentKey,
      orderId,
      amount: Number(amount),
    });

    await db.collection('payment_orders').updateOne(
      { orderId },
      { $set: { status: 'PAID', paymentKey, paidAt: new Date(), tossResponse: paymentResult } }
    );

    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    await db.collection('subscriptions').updateOne(
      { email: session.user.email },
      {
        $set: {
          email: session.user.email,
          planId: order.planId,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: nextBillingDate,
          lastPaymentAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    // 플랜별 dailyLimit 업데이트 (users 없으면 upsert로 생성)
    const PLAN_LIMITS: Record<string, number> = {
      light: 20,
      pro: 40,
      'pro-plus': 50,
      ultra: 100,
    };
    const newLimit = PLAN_LIMITS[order.planId] ?? 20;
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
          providerId: order.planId,
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

    return NextResponse.json({
      success: true,
      planId: order.planId,
      paymentKey: paymentResult.paymentKey,
      orderId: paymentResult.orderId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '결제 승인 중 오류가 발생했습니다.';
    console.error('[Payments confirm] error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
