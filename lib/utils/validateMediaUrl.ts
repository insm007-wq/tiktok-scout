/**
 * URL 유효성 검증 유틸리티
 * R2 URL vs 만료 가능 CDN URL 구분
 */

export interface MediaUrlValidation {
  isValid: boolean;
  urlType: 'r2' | 'cdn' | 'unknown';
  reason?: string;
}

/**
 * R2 URL인지 확인
 */
export function isR2Url(url?: string): boolean {
  if (!url) return false;
  return url.includes('.r2.dev/') || url.includes('r2.cloudflarestorage.com');
}

/**
 * CDN URL인지 확인 (만료 가능성 있음)
 */
export function isCdnUrl(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('tiktokcdn') ||
    url.includes('douyinpic') ||
    url.includes('xhscdn') ||
    url.includes('cloudfront.net')
  );
}

/**
 * 미디어 URL 유효성 검증
 */
export function validateMediaUrl(url?: string): MediaUrlValidation {
  if (!url) {
    return { isValid: false, urlType: 'unknown', reason: 'URL is empty' };
  }

  // R2 URL - 항상 유효
  if (isR2Url(url)) {
    return { isValid: true, urlType: 'r2' };
  }

  // CDN URL - 만료 가능성 있음 (24시간 이내만 유효하다고 간주)
  if (isCdnUrl(url)) {
    return {
      isValid: false,
      urlType: 'cdn',
      reason: 'CDN URL may be expired (24h TTL)',
    };
  }

  // 알 수 없는 URL - 유효하다고 간주
  return { isValid: true, urlType: 'unknown' };
}

/**
 * VideoResult 배열에서 유효하지 않은 URL을 가진 비디오 필터링
 */
export function filterValidVideos<T extends { thumbnail?: string; videoUrl?: string }>(
  videos: T[]
): T[] {
  return videos.filter((video) => {
    const thumbnailValidation = validateMediaUrl(video.thumbnail);
    const videoValidation = validateMediaUrl(video.videoUrl);

    // 썸네일 또는 비디오 중 하나라도 유효한 R2 URL이면 포함
    const hasValidThumbnail = thumbnailValidation.isValid || thumbnailValidation.urlType === 'r2';
    const hasValidVideo = videoValidation.isValid || videoValidation.urlType === 'r2';

    return hasValidThumbnail || hasValidVideo;
  });
}
