/**
 * 비디오 검색 결과 타입
 */
export type { VideoResult, Platform } from './video';

/**
 * 검색 필터 타입
 */
export interface SearchFilter {
  uploadPeriod: 'all' | 'yesterday' | '7days' | '1month' | '3months' | '6months';
  videoLength: 'all' | 'short' | 'medium' | 'long';
  engagementRatio: string[];
}

/**
 * API 검색 응답 타입
 */
export interface SearchResponse {
  success: boolean;
  query: string;
  platform: 'tiktok' | 'douyin' | 'xiaohongshu';
  videos: any[];
  count?: {
    videos: number;
  };
  fromCache?: boolean;
  error?: string;
}
