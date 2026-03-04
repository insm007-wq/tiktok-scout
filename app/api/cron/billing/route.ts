import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { chargeBillingKey } from '@/lib/tosspayments';
import { sendBillingSuccessEmail, sendBillingFailureEmail } from '@/lib/email';
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
 * 자동 구독 갱신 크론
 * GET /api/cron/billing
 * Header: x-cron-secret: <CRON_SECRET>
 *
 * 실행 방법 (서버 crontab, 매일 KST 00:05 = UTC 15:05):
 * 5 15 * * * curl -s -X GET https://도메인/api/cron/billing -H "x-cron-secret: $CRON_SECRET"
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const headerSecret = request.headers.get('x-cron-secret');
  if (headerSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { db } = await connectToDatabase();

  // KST 기준 오늘 날짜 범위 (UTC+9)
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const kstToday = kstNow.toISOString().split('T')[0];

  const todayStart = new Date(`${kstToday}T00:00:00+09:00`);
  const todayEnd = new Date(`${kstToday}T23:59:59+09:00`);

  // 오늘 갱신일인 활성 구독 중 빌링키가 있는 것 조회
  const subscriptions = await db.collection('subscriptions').find({
    status: 'active',
    billingKey: { $exists: true },
    currentPeriodEnd: { $gte: todayStart, $lte: todayEnd },
  }).toArray();

  const results = { success: 0, failed: 0, skipped: 0 };

  for (const sub of subscriptions) {
    const amount = PLAN_PRICES[sub.planId];
    if (!amount) {
      results.skipped++;
      continue;
    }

    const orderId = `tiktalk-${new ObjectId().toString()}-${Date.now()}`;

    try {
      const paymentResult = await chargeBillingKey({
        billingKey: sub.billingKey,
        customerKey: sub.customerKey,
        amount,
        orderId,
        orderName: `틱톡킬라 ${sub.planId} 플랜 구독 갱신`,
        customerEmail: sub.email,
      });

      const nextPeriodEnd = new Date(sub.currentPeriodEnd);
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

      // payment_orders 저장
      await db.collection('payment_orders').insertOne({
        orderId,
        email: sub.email,
        planId: sub.planId,
        planName: sub.planId,
        amount,
        status: 'PAID',
        type: 'billing_renewal',
        billingKey: sub.billingKey,
        paymentKey: paymentResult.paymentKey,
        paidAt: now,
        tossResponse: paymentResult,
        createdAt: now,
      });

      // 구독 갱신
      await db.collection('subscriptions').updateOne(
        { email: sub.email },
        {
          $set: {
            currentPeriodStart: sub.currentPeriodEnd,
            currentPeriodEnd: nextPeriodEnd,
            lastPaymentAt: now,
            paymentFailCount: 0,
            lastPaymentFailedAt: null,
            updatedAt: now,
          },
        }
      );

      // 결제 성공 이메일 발송
      try {
        await sendBillingSuccessEmail(sub.email, {
          planName: sub.planId,
          amount,
          periodEnd: nextPeriodEnd.toISOString().split('T')[0],
          isRenewal: true,
        });
      } catch (emailErr) {
        console.error(`[Cron billing] 결제 성공 이메일 발송 실패 email=${sub.email}`, emailErr);
      }

      results.success++;
    } catch (err) {
      const failCount = (sub.paymentFailCount ?? 0) + 1;
      console.error(`[Cron billing] 결제 실패 email=${sub.email} failCount=${failCount}`, err);

      const updateFields: Record<string, unknown> = {
        paymentFailCount: failCount,
        lastPaymentFailedAt: now,
        updatedAt: now,
      };

      if (failCount >= 3) {
        updateFields.status = 'payment_failed';

        // dailyLimit 0으로 제한
        await db.collection('users').updateOne(
          { email: sub.email },
          { $set: { dailyLimit: 0, remainingLimit: 0, updatedAt: now } }
        );
      }

      await db.collection('subscriptions').updateOne(
        { email: sub.email },
        { $set: updateFields }
      );

      // 결제 실패 이메일 발송
      try {
        await sendBillingFailureEmail(sub.email, {
          planName: sub.planId,
          failCount,
          serviceUntil: failCount >= 3 ? undefined : sub.currentPeriodEnd?.toISOString().split('T')[0],
        });
      } catch (emailErr) {
        console.error(`[Cron billing] 결제 실패 이메일 발송 실패 email=${sub.email}`, emailErr);
      }

      results.failed++;
    }
  }

  // 취소된 구독 중 기간이 만료된 것 처리 → dailyLimit 0
  const expiredSubs = await db.collection('subscriptions').find({
    status: 'cancelled',
    currentPeriodEnd: { $lt: todayStart },
  }).toArray();

  let expiredCount = 0;
  for (const sub of expiredSubs) {
    await db.collection('subscriptions').updateOne(
      { email: sub.email },
      { $set: { status: 'expired', updatedAt: now } }
    );
    await db.collection('users').updateOne(
      { email: sub.email },
      { $set: { dailyLimit: 0, remainingLimit: 0, updatedAt: now } }
    );
    expiredCount++;
  }

  if (expiredCount > 0) {
    console.log(`[Cron billing] 만료 처리: ${expiredCount}건`);
  }

  console.log(`[Cron billing] 완료: ${JSON.stringify(results)}`);
  return NextResponse.json({ ok: true, processed: subscriptions.length, expired: expiredCount, ...results });
}
