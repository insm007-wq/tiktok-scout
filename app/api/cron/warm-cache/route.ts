import { NextRequest, NextResponse } from 'next/server';
import { runCacheWarming, getCacheWarmingStats } from '@/lib/scheduled/cache-warming';

// GET /api/cron/warm-cache
// Vercel Cron 또는 외부 스케줄러에서 주기적으로 호출
// 매 6시간마다 인기 검색어 상위 20개를 캐시로 갱신
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron 토큰 검증 (선택사항)
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && token !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Cache warming started at', new Date().toISOString());

    // 캐시 워밍 실행
    const startTime = Date.now();
    await runCacheWarming(20);
    const duration = Date.now() - startTime;

    // 워밍 통계 조회
    const stats = await getCacheWarmingStats();

    return NextResponse.json(
      {
        success: true,
        message: 'Cache warming completed',
        duration: `${duration}ms`,
        stats,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          // Vercel은 이 헤더로 Cron 작업 성공을 인식
          'X-Cron-Token': cronSecret || 'not-configured',
        },
      }
    );
  } catch (error) {
    console.error('[Cron] Cache warming error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST /api/cron/warm-cache - 수동 캐시 워밍 (테스트용)
export async function POST(request: NextRequest) {
  try {
    // 환경변수에서 비밀키 확인
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const limit = body.limit || 20;

    console.log(`[Manual Cache Warming] Started with limit=${limit}`);

    const startTime = Date.now();
    await runCacheWarming(limit);
    const duration = Date.now() - startTime;

    const stats = await getCacheWarmingStats();

    return NextResponse.json(
      {
        success: true,
        message: 'Manual cache warming completed',
        duration: `${duration}ms`,
        stats,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Manual Cache Warming] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
