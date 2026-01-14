import { VideoResult, Platform } from '@/types/video';

/**
 * MongoDB video_cache 컬렉션 문서 스키마
 */
export interface VideoCacheDocument {
  _id?: string;
  cacheKey: string;                    // "tiktok:메이크업:last7days"
  platform: Platform;
  query: string;                       // 검색어
  dateRange: string;                   // 날짜 범위
  videos: VideoResult[];               // 영상 목록
  videoCount: number;                  // 결과 개수
  createdAt: Date;                     // 캐시 생성 시간
  expiresAt: Date;                     // 만료 시간 (TTL 인덱스)
  accessCount: number;                 // 조회 횟수 (인기도 추적)
  lastAccessedAt: Date;                // 마지막 조회 시간
}

/**
 * 캐시 키 생성 함수
 * 플랫폼, 검색어, 날짜 범위로 고유한 캐시 키 생성
 */
export function generateCacheKey(
  platform: Platform,
  query: string,
  dateRange?: string
): string {
  return `${platform}:${query.toLowerCase().trim()}:${dateRange || 'all'}`;
}
