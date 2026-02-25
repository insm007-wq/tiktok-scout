import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

const PLAN_NAMES: Record<string, string> = {
  light: '라이트',
  pro: '프로',
  'pro-plus': '프로+',
  ultra: '울트라',
};

/**
 * GET /api/user/subscription
 * 현재 로그인 유저의 구독 상태 조회
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const email = session.user.email;

    const subscription = await db.collection('subscriptions').findOne({ email });

    if (!subscription) {
      return NextResponse.json({ isSubscribed: false, subscription: null });
    }

    const now = new Date();
    const isActive =
      subscription.status === 'active' &&
      subscription.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd) > now;

    const isCancelled = subscription.status === 'cancelled';
    // 취소되었지만 기간이 아직 남아 있으면 서비스 유지
    const isCancelledButActive =
      isCancelled &&
      subscription.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd) > now;

    return NextResponse.json({
      isSubscribed: !!(isActive || isCancelledButActive),
      subscription: {
        planId: subscription.planId,
        planName: PLAN_NAMES[subscription.planId] ?? subscription.planId,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd).toISOString().split('T')[0]
          : null,
        cancelledAt: subscription.cancelledAt
          ? new Date(subscription.cancelledAt).toISOString().split('T')[0]
          : null,
      },
    });
  } catch (error) {
    console.error('[User subscription] error:', error);
    return NextResponse.json({ error: '구독 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
