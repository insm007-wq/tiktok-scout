import { NextRequest, NextResponse } from 'next/server';
import { getPopularQueries } from '@/lib/cache';
import { searchQueue } from '@/lib/queue/search-queue';

/**
 * ⚠️ DEPRECATED: Automatic Vercel Cron disabled (2026-01-30)
 *
 * GET /api/cron/refresh-popular
 * Manual refresh endpoint for popular search queries (no longer auto-scheduled)
 *
 * 비용 최적화 전략 (On-Demand Scraping):
 * - 자동 갱신 크론 제거 → -300K Apify 크레딧/월
 * - 12시간 TTL → 캐시 만료 시 사용자가 재검색하면 자동 갱신
 * - 실제 사용량 기반 스크래핑으로 비용 75% 절감
 *
 * 작동:
 * 1. MongoDB에서 검색 횟수 5회 이상의 인기 검색어 조회
 * 2. 각 검색어를 검색 큐(BullMQ)에 추가
 * 3. Railway Worker가 비동기로 처리
 * 4. 새로운 CDN URL로 캐시 갱신
 *
 * Vercel Cron 설정: ❌ REMOVED (vercel.json에서 삭제됨)
 *
 * 수동 테스트 용도:
 * POST /api/cron/refresh-popular
 * Header: Authorization: Bearer ${ADMIN_SECRET}
 */
export async function GET(request: NextRequest) {
  try {
    // 보안: CRON_SECRET 검증
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[RefreshPopular] ⚠️ Manual refresh started (auto cron disabled)', new Date().toISOString());
    const startTime = Date.now();

    // 1️⃣ 인기 검색어 조회 (검색 횟수 5회 이상)
    const minSearchCount = 5;
    const limit = 50;
    const popularQueries = await getPopularQueries(minSearchCount, limit);

    console.log(`[RefreshPopular] 📊 Found ${popularQueries.length} popular queries (searchCount >= ${minSearchCount})`);

    if (popularQueries.length === 0) {
      const duration = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        message: 'No popular queries to refresh',
        queriesFound: 0,
        queriesQueued: 0,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    }

    // 2️⃣ 각 검색어를 큐에 추가
    let queued = 0;
    const queueErrors: string[] = [];

    for (const cache of popularQueries) {
      try {
        await searchQueue.add('search', {
          query: cache.query,
          platform: cache.platform,
          dateRange: cache.dateRange !== 'all' ? cache.dateRange : undefined,
          isAutoRefresh: true,  // 자동 갱신 플래그
        });

        queued++;
        console.log(`[RefreshPopular] ✅ Queued: ${cache.query} (${cache.platform}) - searchCount: ${cache.searchCount}`);

        // Rate limiting (Apify 보호)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        queueErrors.push(`${cache.query}: ${errorMsg}`);
        console.error(`[RefreshPopular] ❌ Failed to queue: ${cache.query}`, error);
      }
    }

    const duration = Date.now() - startTime;

    console.log(`[RefreshPopular] ✅ Completed: ${queued}/${popularQueries.length} queued (${duration}ms)`);

    return NextResponse.json({
      success: true,
      message: `Refresh job completed: ${queued} queries queued`,
      queriesFound: popularQueries.length,
      queriesQueued: queued,
      queueErrors: queueErrors.length > 0 ? queueErrors : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[RefreshPopular] Error:', error);

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

/**
 * POST /api/cron/refresh-popular - 수동 갱신 (테스트용)
 */
export async function POST(request: NextRequest) {
  try {
    // 보안: ADMIN_SECRET 검증
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const minSearchCount = body.minSearchCount || 5;
    const limit = body.limit || 50;

    console.log(`[Manual RefreshPopular] Started with minSearchCount=${minSearchCount}, limit=${limit}`);

    const startTime = Date.now();
    const popularQueries = await getPopularQueries(minSearchCount, limit);

    let queued = 0;
    const queueErrors: string[] = [];

    for (const cache of popularQueries) {
      try {
        await searchQueue.add('search', {
          query: cache.query,
          platform: cache.platform,
          dateRange: cache.dateRange !== 'all' ? cache.dateRange : undefined,
          isAutoRefresh: true,
        });

        queued++;
        console.log(`[Manual RefreshPopular] ✅ Queued: ${cache.query}`);

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        queueErrors.push(`${cache.query}: ${errorMsg}`);
        console.error(`[Manual RefreshPopular] ❌ Failed to queue: ${cache.query}`, error);
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Manual refresh completed: ${queued} queries queued`,
      queriesFound: popularQueries.length,
      queriesQueued: queued,
      queueErrors: queueErrors.length > 0 ? queueErrors : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Manual RefreshPopular] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
