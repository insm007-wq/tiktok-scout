/**
 * 계층형 캐시 시스템: L1(메모리) + L2(MongoDB)
 * - L1: LRU 메모리 캐시 (최대 10,000 항목, 최대 24시간 보관)
 * - L2: MongoDB 캐시 (6시간 TTL, On-Demand 스크래핑, CDN URL 만료 대응)
 */

import { VideoResult, Platform } from '@/types/video';
import { getDb } from './mongodb';
import { VideoCacheDocument, generateCacheKey } from './models/VideoCache';
import { LRUCache } from 'lru-cache';
import { isR2Url, isCdnUrl } from './utils/validateMediaUrl';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// 영상 결과 캐시(L1) TTL: CDN URL 만료 주기에 맞춰 6시간
const VIDEO_L1_TTL_MS = 6 * 60 * 60 * 1000;

// LRU 캐시 설정: 최대 10,000개 항목, 24시간 TTL
const cache = new LRUCache<string, CacheEntry<any>>({
  max: 10000,                    // 최대 10,000개 항목
  ttl: 24 * 60 * 60 * 1000,     // 24시간
  updateAgeOnGet: true,          // GET할 때 TTL 갱신
  allowStale: false,             // 만료된 항목 반환 안 함
  ttlAutopurge: true             // 만료된 항목 자동 삭제
});

/**
 * 캐시 통계 조회
 */
export function getCacheStats() {
  let count = 0;
  let totalSize = 0;

  cache.forEach((entry) => {
    if (Date.now() <= entry.expiresAt) {
      count++;
      totalSize += JSON.stringify(entry.data).length;
    }
  });

  return {
    count,
    totalSizeKB: Math.round(totalSize / 1024),
  };
}

/**
 * 캐시 전체 삭제
 */
export function clearCache() {
  const size = cache.size;
  cache.clear();
}

/**
 * 번역 캐시에서 데이터 조회
 */
export function getTranslationFromCache(text: string, targetLanguage: string): string | null {
  const key = `translation:${text}:${targetLanguage}`;
  const entry = cache.get(key);

  if (!entry) return null;

  // 만료 확인
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data as string;
}

/**
 * 번역 캐시에 데이터 저장 (기본 TTL: 24시간)
 */
export function setTranslationCache(
  text: string,
  targetLanguage: string,
  translatedText: string,
  ttlHours: number = 24
): void {
  const key = `translation:${text}:${targetLanguage}`;
  const expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;

  cache.set(key, {
    data: translatedText,
    expiresAt,
  });

}

/**
 * ========================================
 * L2: MongoDB 캐시 함수들
 * ========================================
 */

/**
 * MongoDB에서 영상 캐시 조회 (L2 캐시)
 */
export async function getVideoFromMongoDB(
  query: string,
  platform: Platform,
  dateRange?: string
): Promise<{ videos: VideoResult[] } | null> {
  try {
    const db = await getDb();
    const cacheKey = generateCacheKey(platform, query, dateRange);

    const cached = await db.collection<VideoCacheDocument>('video_cache')
      .findOne({ cacheKey });

    if (!cached) {
      return null;
    }

    // 만료 확인 (TTL 인덱스 대비 이중 체크)
    if (cached.expiresAt < new Date()) {
      console.warn(`[Cache] ⏰ TTL 만료됨 (재스크래핑 필요)`, {
        query: query.substring(0, 30),
        platform,
        expiresAt: cached.expiresAt.toISOString(),
        now: new Date().toISOString(),
        expiredMs: new Date().getTime() - cached.expiresAt.getTime()
      })
      return null;
    }

    // ✅ DEBUG: 캐시 히트 로그
    const remainingMs = cached.expiresAt.getTime() - Date.now();
    const remainingHours = (remainingMs / (60 * 60 * 1000)).toFixed(1);
    console.log(`[Cache] ✅ Cache hit from MongoDB`, {
      platform,
      query: query.substring(0, 30),
      videoCount: cached.videos.length,
      expiresAt: cached.expiresAt.toISOString(),
      remainingHours: parseFloat(remainingHours),
      remainingMs,
    });

    // 조회 통계 업데이트 (비동기로 실행)
    // searchCount: 사용자 검색 횟수 (인기도 판정용)
    // accessCount: 전체 조회 횟수
    db.collection('video_cache').updateOne(
      { cacheKey },
      {
        $inc: {
          accessCount: 1,
          searchCount: 1  // 사용자 검색 카운터 증가
        },
        $set: { lastAccessedAt: new Date() }
      }
    ).catch(() => {});

    return { videos: cached.videos };
  } catch (error) {
    return null;
  }
}

/**
 * MongoDB에 영상 캐시 저장 (L2 캐시)
 * @param ttlDays - 캐시 유지 기간 (기본값: 0.25일 - 6시간 TTL)
 */
export async function setVideoToMongoDB(
  query: string,
  platform: Platform,
  videos: VideoResult[],
  dateRange?: string,
  ttlDays: number = 0.25  // ✅ Changed: 6시간 TTL (0.25일, CDN URL 만료 대응)
): Promise<void> {
  try {
    const db = await getDb();
    const cacheKey = generateCacheKey(platform, query, dateRange);

    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const doc: VideoCacheDocument = {
      cacheKey,
      platform,
      query: query.trim(),
      dateRange: dateRange || 'all',
      videos,
      videoCount: videos.length,
      createdAt: new Date(),
      expiresAt,
      accessCount: 1,
      searchCount: 0,  // ✅ NEW: 초기화 (getVideoFromMongoDB에서 증가)
      lastAccessedAt: new Date(),
    };

    // ✅ DEBUG: TTL 검증 로그
    const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
    const ttlHours = (ttlMs / (60 * 60 * 1000)).toFixed(1);
    console.log(`[Cache] 💾 Saving to MongoDB`, {
      platform,
      query: query.substring(0, 30),
      videoCount: videos.length,
      ttlDays,
      ttlHours: parseFloat(ttlHours),
      expiresAt: expiresAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      expiresAtTimestamp: expiresAt.getTime(),
      nowTimestamp: Date.now(),
    });

    const result = await db.collection('video_cache').updateOne(
      { cacheKey },
      { $set: doc },
      { upsert: true }
    );

    console.log(`[Cache] ✅ MongoDB 저장 완료`, {
      platform,
      query: query.substring(0, 30),
      videoCount: videos.length,
      cacheKey: cacheKey.substring(0, 50),
      upsertedId: result.upsertedId,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      expiresAt: expiresAt.toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[Cache] ❌ MongoDB 저장 실패`, {
      query: query.substring(0, 30),
      platform,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * ========================================
 * 통합 캐시 함수 (L1 + L2)
 * ========================================
 */

/**
 * 영상 캐시 조회: 메모리(L1) → MongoDB(L2)
 */
export async function getVideoFromCache(
  query: string,
  platform: Platform,
  dateRange?: string
): Promise<{ videos: VideoResult[] } | null> {
  const memoryKey = `video:${platform}:${query}:${dateRange || 'all'}`;

  // L1: 메모리 캐시 확인
  const memoryCache = cache.get(memoryKey);
  if (memoryCache && Date.now() <= memoryCache.expiresAt) {
    return memoryCache.data;
  }

  // L2: MongoDB 캐시 확인
  const mongoCache = await getVideoFromMongoDB(query, platform, dateRange);
  if (mongoCache) {
    // ✅ 모든 URL 허용 (R2 + CDN)
    const validVideos = mongoCache.videos;

    // ✅ 통계 로깅만 유지
    const urlStats = validVideos.reduce((acc, video) => {
      if (isR2Url(video.thumbnail)) acc.r2++;
      else if (isCdnUrl(video.thumbnail)) acc.cdn++;
      else acc.unknown++;
      return acc;
    }, { r2: 0, cdn: 0, unknown: 0 });

    console.log(`[Cache] 📊 Cache returned`, {
      platform,
      query: query.substring(0, 30),
      totalVideos: validVideos.length,
      urlStats,
    });

    const filteredCache = { videos: validVideos };

    // L1 캐시 웜업 (메모리에도 저장, 6시간 TTL)
    const expiresAt = Date.now() + VIDEO_L1_TTL_MS;
    cache.set(memoryKey, {
      data: filteredCache,
      expiresAt,
    });

    return filteredCache;
  }

  return null;
}

/**
 * 영상 캐시 저장: 메모리(L1) + MongoDB(L2)
 */
export async function setVideoToCache(
  query: string,
  platform: Platform,
  videos: VideoResult[],
  dateRange?: string
): Promise<void> {
  // ✅ DEBUG: 첫 번째 비디오의 thumbnail 필드 확인
  if (videos.length > 0) {
    const firstVideo = videos[0];
    console.log(`[Cache] 📊 First video thumbnail check:`, {
      platform,
      videoId: firstVideo.id,
      title: firstVideo.title.substring(0, 50),
      hasThumbnail: !!firstVideo.thumbnail,
      thumbnailValue: firstVideo.thumbnail ? firstVideo.thumbnail.substring(0, 80) : 'UNDEFINED',
      thumbnailType: typeof firstVideo.thumbnail,
    });
  }

  // ✅ NEW: 저장 전 URL 타입 통계
  const urlStats = videos.reduce((acc, video) => {
    if (isR2Url(video.thumbnail)) acc.r2++;
    else if (isCdnUrl(video.thumbnail)) acc.cdn++;
    else acc.unknown++;
    return acc;
  }, { r2: 0, cdn: 0, unknown: 0 });

  console.log(`[Cache] 💾 Saving to cache`, {
    platform,
    query: query.substring(0, 30),
    videoCount: videos.length,
    thumbnailCount: videos.filter(v => !!v.thumbnail).length,
    urlStats,
  });

  // ⚠️ CDN URL 비율이 30% 이상이면 경고
  if (urlStats.cdn > videos.length * 0.3) {
    console.warn(`[Cache] ⚠️ High CDN URL ratio detected (${((urlStats.cdn / videos.length) * 100).toFixed(1)}%)`, {
      platform,
      query: query.substring(0, 30),
      cdnCount: urlStats.cdn,
      totalCount: videos.length,
    });
  }

  const memoryKey = `video:${platform}:${query}:${dateRange || 'all'}`;
  const data = { videos };

  // L1: 메모리 캐시 (6시간)
  const expiresAt = Date.now() + VIDEO_L1_TTL_MS;
  cache.set(memoryKey, {
    data,
    expiresAt,
  });

  // L2: MongoDB 캐시 (6시간 TTL for on-demand scraping)
  // Note: TTL shortened to 6 hours to match CDN URL expiration time (~6 hours)
  // CDN URL 만료 전에 캐시 자동 삭제되므로 사용자가 만료된 URL을 받지 않음
  await setVideoToMongoDB(query, platform, videos, dateRange, 0.25);
}

/**
 * 특정 검색의 캐시 삭제 (L1 + L2)
 * 취소 시 사용되어 잘못된 캐시가 남지 않도록 함
 */
export async function clearSearchCache(
  query: string,
  platform: Platform,
  dateRange?: string
): Promise<void> {
  try {
    // L1 메모리 캐시 삭제 (getVideoFromCache와 동일한 키 형식 사용)
    const memoryKey = `video:${platform}:${query}:${dateRange || 'all'}`;
    cache.delete(memoryKey);
    console.log(`[Cache] L1 cache cleared: ${memoryKey}`);

    // L2 MongoDB 캐시 삭제 (generateCacheKey 사용)
    const db = await getDb();
    const cacheKey = generateCacheKey(platform, query, dateRange);
    const result = await db.collection('video_cache').deleteOne({ cacheKey });

    if (result.deletedCount > 0) {
      console.log(`[Cache] L2 cache cleared: ${cacheKey}`);
    } else {
      console.log(`[Cache] No L2 cache found: ${cacheKey}`);
    }
  } catch (error) {
    console.error('[Cache] Error clearing search cache:', error);
    // 에러를 throw하지 않음 (취소 작업은 계속 진행되어야 함)
  }
}