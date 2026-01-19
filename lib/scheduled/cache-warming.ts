/**
 * 캐시 워밍: 6시간마다 인기 검색어 상위 20개 자동 수집
 * - MongoDB에서 accessCount 상위 검색어 추출
 * - 스크래핑 서버 또는 로컬 scraper로 데이터 재수집
 * - L1(메모리) + L2(MongoDB) 캐시 갱신
 */

import { getDb } from '@/lib/mongodb';
import { setVideoToCache } from '@/lib/cache';
import { Platform } from '@/types/video';

interface PopularSearchQuery {
  query: string;
  platform: Platform;
  accessCount: number;
  lastAccessedAt: Date;
}

/**
 * MongoDB에서 인기 검색어 상위 N개 추출
 */
export async function getPopularSearchQueries(limit: number = 20): Promise<PopularSearchQuery[]> {
  try {
    const db = await getDb();

    const results = await db
      .collection('video_cache')
      .find({})
      .sort({ accessCount: -1 })
      .limit(limit)
      .project({
        query: 1,
        platform: 1,
        accessCount: 1,
        lastAccessedAt: 1,
      })
      .toArray();

    return results.map((doc: any) => ({
      query: doc.query,
      platform: doc.platform,
      accessCount: doc.accessCount || 0,
      lastAccessedAt: doc.lastAccessedAt || new Date(),
    }));
  } catch (error) {
    console.error('[Cache Warming] Error getting popular queries:', error);
    return [];
  }
}

/**
 * 스크래핑 서버를 통해 캐시 데이터 갱신
 * (메인 앱의 경우, 스크래핑 서버 API를 호출)
 */
export async function warmCacheFromServer(
  query: string,
  platform: Platform,
  serverUrl?: string
): Promise<boolean> {
  try {
    // 스크래핑 서버 URL (환경변수에서 가져옴)
    const scraperUrl = serverUrl || process.env.SCRAPER_SERVER_URL;
    if (!scraperUrl) {
      console.warn('[Cache Warming] SCRAPER_SERVER_URL not configured');
      return false;
    }

    const response = await fetch(`${scraperUrl}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.SCRAPER_API_KEY || '',
      },
      body: JSON.stringify({
        query,
        platform,
        limit: 100,
      }),
    });

    if (!response.ok) {
      console.error(`[Cache Warming] Scraper returned ${response.status}`);
      return false;
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.videos)) {
      console.error('[Cache Warming] Invalid response from scraper');
      return false;
    }

    // 캐시에 저장 (L1 + L2)
    await setVideoToCache(query, platform, data.videos);

    console.log(`[Cache Warming] ✅ Warmed cache for: ${platform}/${query} (${data.videos.length} videos)`);
    return true;
  } catch (error) {
    console.error(`[Cache Warming] Error warming cache for ${query}:`, error);
    return false;
  }
}

/**
 * 캐시 워밍 메인 함수
 * 인기 검색어 상위 20개를 병렬로 갱신
 */
export async function runCacheWarming(limit: number = 20): Promise<void> {
  try {
    const startTime = Date.now();
    console.log(`[Cache Warming] 🔄 Starting cache warming for top ${limit} queries...`);

    // 1️⃣ 인기 검색어 추출
    const popularQueries = await getPopularSearchQueries(limit);

    if (popularQueries.length === 0) {
      console.log('[Cache Warming] ℹ️ No popular queries found');
      return;
    }

    console.log(
      `[Cache Warming] 📊 Found ${popularQueries.length} popular queries: ${popularQueries
        .map((q) => `${q.platform}/${q.query}`)
        .join(', ')}`
    );

    // 2️⃣ 병렬로 캐시 갱신 (최대 5개씩)
    const concurrency = 5;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < popularQueries.length; i += concurrency) {
      const batch = popularQueries.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map((q) => warmCacheFromServer(q.query, q.platform))
      );

      successCount += results.filter((r) => r).length;
      failCount += results.filter((r) => !r).length;

      console.log(
        `[Cache Warming] 📈 Progress: ${i + batch.length}/${popularQueries.length} (${successCount} success, ${failCount} failed)`
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Cache Warming] ✅ Cache warming completed in ${duration}ms (${successCount}/${popularQueries.length} successful)`
    );
  } catch (error) {
    console.error('[Cache Warming] Fatal error:', error);
  }
}

/**
 * 캐시 워밍 상태 조회
 */
export async function getCacheWarmingStats() {
  try {
    const db = await getDb();

    // 캐시된 검색어 수
    const cacheCount = await db.collection('video_cache').countDocuments({});

    // 인기 검색어 상위 5개
    const topSearches = await db
      .collection('video_cache')
      .find({})
      .sort({ accessCount: -1 })
      .limit(5)
      .toArray();

    // 최근 접근 쿼리
    const recentSearches = await db
      .collection('video_cache')
      .find({})
      .sort({ lastAccessedAt: -1 })
      .limit(5)
      .toArray();

    return {
      totalCachedQueries: cacheCount,
      topSearches: topSearches.map((doc) => ({
        query: doc.query,
        platform: doc.platform,
        accessCount: doc.accessCount,
      })),
      recentSearches: recentSearches.map((doc) => ({
        query: doc.query,
        platform: doc.platform,
        lastAccessedAt: doc.lastAccessedAt,
      })),
    };
  } catch (error) {
    console.error('[Cache Warming] Error getting stats:', error);
    return {
      totalCachedQueries: 0,
      topSearches: [],
      recentSearches: [],
    };
  }
}

/**
 * 캐시 워밍 상태 모니터링 (선택사항)
 */
let lastWarmingTime = 0;
const WARMING_INTERVAL = 6 * 60 * 60 * 1000; // 6시간

export async function checkAndRunCacheWarming(): Promise<void> {
  const now = Date.now();

  // 6시간 이상 지났으면 캐시 워밍 실행
  if (now - lastWarmingTime >= WARMING_INTERVAL) {
    lastWarmingTime = now;
    await runCacheWarming(20);
  }
}
