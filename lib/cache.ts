/**
 * 메모리 기반 검색 결과 캐싱 시스템
 * - 5분 TTL (Time To Live)
 * - 최대 100개 항목 관리
 * - 플랫폼과 검색어 기반 키 생성
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  query: string;
  platform: string;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

/**
 * 캐시 키 생성
 * @param query 검색어
 * @param platform 플랫폼 (tiktok, douyin, xiaohongshu)
 * @returns 캐시 키
 */
export function getCacheKey(query: string, platform: string): string {
  return `${platform}:${query.toLowerCase().trim()}`;
}

/**
 * 캐시에서 데이터 조회
 * @param query 검색어
 * @param platform 플랫폼
 * @returns 캐시된 데이터 또는 null
 */
export function getFromCache(query: string, platform: string): any | null {
  const key = getCacheKey(query, platform);
  const entry = cache.get(key);

  if (!entry) return null;

  // 캐시 유효성 검사
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    console.log(`[Cache] EXPIRED: ${key} (age: ${Math.round(age / 1000)}s)`);
    return null;
  }

  console.log(`[Cache] HIT: ${key} (age: ${Math.round(age / 1000)}s)`);
  return entry.data;
}

/**
 * 캐시에 데이터 저장
 * @param query 검색어
 * @param platform 플랫폼
 * @param data 저장할 데이터
 */
export function setCache(query: string, platform: string, data: any): void {
  const key = getCacheKey(query, platform);
  cache.set(key, {
    data,
    timestamp: Date.now(),
    query,
    platform
  });
  console.log(`[Cache] SET: ${key} (size: ${cache.size})`);

  // 메모리 관리: 100개 이상이면 오래된 항목 삭제
  if (cache.size > 100) {
    const entries = Array.from(cache.entries());
    const oldestEntry = entries.reduce((min, curr) =>
      curr[1].timestamp < min[1].timestamp ? curr : min
    );
    cache.delete(oldestEntry[0]);
    console.log(`[Cache] EVICTED: ${oldestEntry[0]} (memory management)`);
  }
}

/**
 * 캐시 초기화
 */
export function clearCache(): void {
  cache.clear();
  console.log('[Cache] CLEARED');
}

/**
 * 캐시 통계 반환
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ key: string; age: number; ttl: number }>;
} {
  const entries = Array.from(cache.entries()).map(([key, entry]) => ({
    key,
    age: Date.now() - entry.timestamp,
    ttl: CACHE_TTL - (Date.now() - entry.timestamp)
  }));

  return {
    size: cache.size,
    entries
  };
}

/**
 * 번역 캐시 키 생성
 * @param text 번역할 텍스트
 * @param targetLang 대상 언어
 * @returns 캐시 키
 */
export function getTranslationCacheKey(text: string, targetLang: string): string {
  return `translate:${targetLang}:${text.toLowerCase().trim()}`;
}

/**
 * 번역 캐시 조회
 * @param text 번역할 텍스트
 * @param targetLang 대상 언어
 * @returns 캐시된 번역 또는 null
 */
export function getTranslationFromCache(text: string, targetLang: string): string | null {
  const key = getTranslationCacheKey(text, targetLang);
  const entry = cache.get(key);

  if (!entry) return null;

  // 캐시 유효성 검사
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    console.log(`[Translation Cache] EXPIRED: ${key}`);
    return null;
  }

  console.log(`[Translation Cache] HIT: ${key} (age: ${Math.round(age / 1000)}s)`);
  return entry.data;
}

/**
 * 번역 캐시 저장
 * @param text 번역할 텍스트
 * @param targetLang 대상 언어
 * @param translation 번역 결과
 */
export function setTranslationCache(text: string, targetLang: string, translation: string): void {
  const key = getTranslationCacheKey(text, targetLang);
  cache.set(key, {
    data: translation,
    timestamp: Date.now(),
    query: text,
    platform: `translate-${targetLang}`
  });
  console.log(`[Translation Cache] SET: ${key} (size: ${cache.size})`);

  // 메모리 관리: 100개 이상이면 오래된 항목 삭제
  if (cache.size > 100) {
    const entries = Array.from(cache.entries());
    const oldestEntry = entries.reduce((min, curr) =>
      curr[1].timestamp < min[1].timestamp ? curr : min
    );
    cache.delete(oldestEntry[0]);
    console.log(`[Cache] EVICTED: ${oldestEntry[0]} (memory management)`);
  }
}
