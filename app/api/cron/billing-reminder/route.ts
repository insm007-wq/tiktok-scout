import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { sendBillingReminderEmail } from '@/lib/email';

const PLAN_PRICES: Record<string, number> = {
  light: 19800,
  pro: 29800,
  'pro-plus': 39800,
  ultra: 49800,
};

/**
 * 결제 3일 전 사전 고지 크론
 * GET /api/cron/billing-reminder
 * Header: x-cron-secret: <CRON_SECRET>
 *
 * 실행 방법 (서버 crontab, 매일 KST 10:00 = UTC 01:00):
 * 0 1 * * * curl -s -X GET https://도메인/api/cron/billing-reminder -H "x-cron-secret: $CRON_SECRET"
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

  // KST 기준 오늘+3일 날짜 범위 (UTC+9)
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);

  // 3일 후 KST 날짜
  const kstPlus3 = new Date(kstNow.getTime() + 3 * 24 * 60 * 60 * 1000);
  const kstPlus3Date = kstPlus3.toISOString().split('T')[0];

  const reminderStart = new Date(`${kstPlus3Date}T00:00:00+09:00`);
  const reminderEnd = new Date(`${kstPlus3Date}T23:59:59+09:00`);

  // 오늘 날짜 (중복 발송 방지용)
  const kstToday = kstNow.toISOString().split('T')[0];
  const todayStart = new Date(`${kstToday}T00:00:00+09:00`);

  // 3일 후 결제 예정인 활성 구독 조회 (오늘 이미 발송한 것 제외)
  const subscriptions = await db.collection('subscriptions').find({
    status: 'active',
    billingKey: { $exists: true },
    currentPeriodEnd: { $gte: reminderStart, $lte: reminderEnd },
    $or: [
      { reminderSentAt: { $exists: false } },
      { reminderSentAt: { $lt: todayStart } },
    ],
  }).toArray();

  let sent = 0;
  let skipped = 0;

  for (const sub of subscriptions) {
    const amount = PLAN_PRICES[sub.planId];
    if (!amount) {
      skipped++;
      continue;
    }

    const billingDate = kstPlus3Date;
    const cardLast4 = sub.cardInfo?.last4 as string | undefined;

    try {
      await sendBillingReminderEmail(sub.email, {
        planName: sub.planId,
        amount,
        billingDate,
        cardLast4,
      });

      // 발송 시각 기록 (중복 방지)
      await db.collection('subscriptions').updateOne(
        { email: sub.email },
        { $set: { reminderSentAt: now, updatedAt: now } }
      );

      sent++;
    } catch (err) {
      console.error(`[Cron billing-reminder] 이메일 발송 실패 email=${sub.email}`, err);
      skipped++;
    }
  }

  console.log(`[Cron billing-reminder] 완료: sent=${sent} skipped=${skipped}`);
  return NextResponse.json({ ok: true, sent, skipped });
}
