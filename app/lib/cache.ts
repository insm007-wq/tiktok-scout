/**
 * 간단한 인메모리 캐시 시스템
 * TTL (Time To Live) 지원
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

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

  console.log(`[Cache] 저장: ${key} (TTL: ${ttlMinutes}분)`);
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
    console.log(`[Cache] ${cleaned}개의 만료된 항목 제거`);
  }

  return cleaned;
}

/**
 * 캐시 전체 삭제
 */
export function clearCache() {
  const size = cache.size;
  cache.clear();
  console.log(`[Cache] 전체 캐시 삭제 (${size}개)`);
}
