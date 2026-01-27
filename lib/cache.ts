/**
 * 계층형 캐시 시스템: L1(메모리) + L2(MongoDB)
 * - L1: LRU 메모리 캐시 (24시간 TTL, 최대 10,000 항목)
 * - L2: MongoDB 캐시 (90일 TTL, 영구 저장)
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

// LRU 캐시 설정: 최대 10,000개 항목, 24시간 TTL
const cache = new LRUCache<string, CacheEntry<any>>({
  max: 10000,                    // 최대 10,000개 항목
  ttl: 24 * 60 * 60 * 1000,     // 24시간
  updateAgeOnGet: true,          // GET할 때 TTL 갱신
  allowStale: false,             // 만료된 항목 반환 안 함
  ttlAutopurge: true             // 만료된 항목 자동 삭제
});

/**
 * 캐시 키 생성
 */
function getCacheKey(query: string, platform: string, dateRange?: string): string {
  return `${platform}:${query}:${dateRange || 'all'}`;
}

/**
 * 캐시에서 데이터 조회 (만료 확인)
 */
export function getFromCache<T>(
  query: string,
  platform: string,
  dateRange?: string
): T | null {
  const key = getCacheKey(query, platform, dateRange);
  const entry = cache.get(key);

  if (!entry) return null;

  // 만료 확인
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * 캐시에 데이터 저장 (기본 TTL: 30분)
 */
export function setCache<T>(
  query: string,
  platform: string,
  data: T,
  dateRange?: string,
  ttlMinutes: number = 30
): void {
  const key = getCacheKey(query, platform, dateRange);
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;

  cache.set(key, {
    data,
    expiresAt,
  });

}

/**
 * 캐시 전체 조회
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
 * 만료된 캐시 정리
 */
export function cleanupExpiredCache() {
  let cleaned = 0;

  cache.forEach((entry, key) => {
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      cleaned++;
    }
  });

  if (cleaned > 0) {
  }

  return cleaned;
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
      return null;
    }

    // 조회 통계 업데이트 (비동기로 실행)
    db.collection('video_cache').updateOne(
      { cacheKey },
      {
        $inc: { accessCount: 1 },
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
 * @param ttlDays - 캐시 유지 기간 (기본값: 90일)
 */
export async function setVideoToMongoDB(
  query: string,
  platform: Platform,
  videos: VideoResult[],
  dateRange?: string,
  ttlDays: number = 90
): Promise<void> {
  try {
    const db = await getDb();
    const cacheKey = generateCacheKey(platform, query, dateRange);

    const doc: VideoCacheDocument = {
      cacheKey,
      platform,
      query: query.trim(),
      dateRange: dateRange || 'all',
      videos,
      videoCount: videos.length,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      accessCount: 1,
      lastAccessedAt: new Date(),
    };

    await db.collection('video_cache').updateOne(
      { cacheKey },
      { $set: doc },
      { upsert: true }
    );

  } catch (error) {
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
    // ✅ NEW: CDN URL 필터링 (R2 URL만 반환)
    const validVideos = mongoCache.videos.filter((video) => {
      const hasCdnThumbnail = isCdnUrl(video.thumbnail);
      const hasCdnVideo = isCdnUrl(video.videoUrl);

      // CDN URL만 있는 경우 필터링 (만료되었을 가능성 높음)
      if (hasCdnThumbnail && !isR2Url(video.thumbnail)) {
        console.warn(`[Cache] Filtering video with CDN thumbnail: ${video.id}`);
        return false;
      }

      return true;
    });

    // 유효한 비디오가 50% 미만이면 캐시 무효화 (재스크래핑 필요)
    const validRatio = validVideos.length / mongoCache.videos.length;
    if (validRatio < 0.5) {
      console.warn(`[Cache] Cache quality too low (${Math.round(validRatio * 100)}%), invalidating...`);
      await clearSearchCache(query, platform, dateRange);
      return null;
    }

    const filteredCache = { videos: validVideos };

    // L1 캐시 웜업 (메모리에도 저장, 24시간 TTL)
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
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
  const memoryKey = `video:${platform}:${query}:${dateRange || 'all'}`;
  const data = { videos };

  // L1: 메모리 캐시 (24시간)
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  cache.set(memoryKey, {
    data,
    expiresAt,
  });

  // L2: MongoDB 캐시 (90일)
  await setVideoToMongoDB(query, platform, videos, dateRange, 90);
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
