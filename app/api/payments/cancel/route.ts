import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { sendCancelConfirmEmail } from '@/lib/email';

/**
 * POST /api/payments/cancel
 * 구독 취소 (currentPeriodEnd까지 서비스 유지)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const email = session.user.email;

    const subscription = await db.collection('subscriptions').findOne({ email });

    if (!subscription) {
      return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (subscription.status === 'cancelled') {
      return NextResponse.json({ error: '이미 취소된 구독입니다.' }, { status: 400 });
    }

    await db.collection('subscriptions').updateOne(
      { email },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    const periodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd).toISOString().split('T')[0]
      : null;

    console.log(`[Payments cancel] 구독 취소: ${email}, 만료일: ${periodEnd}`);

    // 취소 확인 이메일 발송
    if (periodEnd) {
      try {
        await sendCancelConfirmEmail(email, {
          planName: subscription.planId,
          serviceUntil: periodEnd,
        });
      } catch (emailErr) {
        console.error('[Payments cancel] 이메일 발송 실패:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: '구독이 취소되었습니다.',
      serviceUntil: periodEnd,
    });
  } catch (error) {
    console.error('[Payments cancel] error:', error);
    return NextResponse.json({ error: '구독 취소 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
