/**
 * 유틸리티 함수 모음
 */

// 날짜 포맷팅
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ko-KR');
}

// 시간 포맷팅
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ko-KR');
}

// 날짜 + 시간
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('ko-KR');
}

// 상대 시간 (예: "2시간 전")
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 30) return `${days}일 전`;

  return formatDate(timestamp);
}

// 숫자 포맷팅 (예: 1000 → "1K")
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// 비디오 길이 포맷팅 (초 → "1:23")
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// 참여율 계산
export function calculateEngagementRate(
  likes: number,
  comments: number,
  shares: number,
  views: number
): number {
  if (views === 0) return 0;
  return Number((((likes + comments + shares) / views) * 100).toFixed(2));
}

// URL에서 비디오 ID 추출
export function extractVideoId(url: string): string {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : '';
}

// 검색어 유효성 확인
export function isValidQuery(query: string): boolean {
  return query && query.trim().length > 0 && query.trim().length <= 500;
}

// 플랫폼별 기본값
export const PLATFORM_DEFAULTS = {
  tiktok: {
    maxResults: 50,
    supportedDateRanges: ['all', 'yesterday', '7days', '1month', '3months'],
  },
  douyin: {
    maxResults: 50,
    supportedDateRanges: ['all', 'yesterday', '7days', '1month', '3months', '6months'],
  },
  xiaohongshu: {
    maxResults: 100,
    supportedDateRanges: ['all'], // Search Scraper는 날짜 필터 미지원
  },
};
