import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getTossClientKey, isTossConfigured } from '@/lib/tosspayments';
import { ObjectId } from 'mongodb';

/**
 * 결제 주문 생성
 * - 로그인 사용자만 사용 가능
 * - orderId 생성 후 클라이언트에서 결제창 호출 시 사용
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    if (!isTossConfigured()) {
      return NextResponse.json(
        { error: '결제가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { planId, amount, planName } = body;

    if (!planId || !amount || typeof amount !== 'number') {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const validPlans = ['light', 'pro', 'pro-plus', 'ultra'];
    if (!validPlans.includes(planId)) {
      return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 });
    }

    const PLAN_PRICES: Record<string, number> = {
      light: 19800,
      pro: 29800,
      'pro-plus': 39800,
      ultra: 49800,
    };
    const expectedAmount = PLAN_PRICES[planId];
    if (expectedAmount === undefined || amount !== expectedAmount) {
      return NextResponse.json({ error: '결제 금액이 플랜과 일치하지 않습니다.' }, { status: 400 });
    }

    const orderId = `tiktalk-${new ObjectId().toString()}-${Date.now()}`;

    const { db } = await connectToDatabase();
    await db.collection('payment_orders').insertOne({
      orderId,
      email: session.user.email,
      planId,
      planName: planName || planId,
      amount,
      status: 'PENDING',
      createdAt: new Date(),
    });

    return NextResponse.json({
      orderId,
      amount,
      clientKey: getTossClientKey(),
    });
  } catch (error) {
    console.error('[Payments create] error:', error);
    return NextResponse.json({ error: '주문 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
