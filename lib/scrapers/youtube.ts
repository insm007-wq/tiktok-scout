import { VideoResult } from '@/types/video';
import { fetchPostWithRetry, fetchGetWithRetry } from '@/lib/utils/fetch-with-retry';

/** 액터 선택: grow_media(권장) | api-ninja. .env에 YOUTUBE_SEARCH_ACTOR=grow_media 설정 */
const YOUTUBE_ACTOR =
  process.env.YOUTUBE_SEARCH_ACTOR === 'grow_media'
    ? 'grow_media~youtube-search-scraper'
    : 'api-ninja~youtube-search-scraper';

const IS_GROW_MEDIA = process.env.YOUTUBE_SEARCH_ACTOR === 'grow_media';

/**
 * Parse YouTube duration string (e.g. "1:00:17", "4:32", "0:45") to seconds
 */
function parseYoutubeDuration(durationStr?: string): number {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/**
 * Parse YouTube date string to timestamp (ms)
 */
function parseYoutubeDate(dateStr?: string): number {
  if (!dateStr) return Date.now();
  const t = new Date(dateStr).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

/**
 * Apify 아웃풋에서 썸네일 URL 추출
 * - 1순위: item.thumbnail (문자열) — API가 주는 "thumbnail": "https://i.ytimg.com/vi/xxx/hq720.jpg?..."
 * - 2순위: item.thumbnail (배열) → 고해상도(너비 큰 것) url
 * - 3순위: item.raw.thumbnail (문자열/배열)
 * - 4순위: item.raw.richThumbnail (배열)
 */
function getYoutubeThumbnailUrl(item: any): string | undefined {
  // grow_media: thumbnailUrl
  const thumbnailUrl = item?.thumbnailUrl;
  if (typeof thumbnailUrl === 'string' && thumbnailUrl.startsWith('http')) return thumbnailUrl;

  const t = item?.thumbnail;

  // Priority 1: item.thumbnail (문자열)
  if (typeof t === 'string' && t.trim()) {
    return t.startsWith('http') ? t : undefined;
  }

  // Priority 2: item.thumbnail (배열 - 고해상도 우선)
  if (Array.isArray(t) && t.length > 0) {
    const byWidth = t.slice().sort((a: any, b: any) => (b?.width ?? 0) - (a?.width ?? 0));
    const url = byWidth[0]?.url;
    if (typeof url === 'string' && url.startsWith('http')) return url;
  }

  // Priority 3: item.raw.thumbnail (문자열/배열)
  const raw = item?.raw?.thumbnail;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.startsWith('http') ? raw : undefined;
  }
  if (Array.isArray(raw) && raw.length > 0) {
    const byWidth = raw.slice().sort((a: any, b: any) => (b?.width ?? 0) - (a?.width ?? 0));
    const url = byWidth[0]?.url;
    if (typeof url === 'string' && url.startsWith('http')) return url;
  }

  // Priority 4: item.raw.richThumbnail (배열)
  const rich = item?.raw?.richThumbnail;
  if (Array.isArray(rich) && rich.length > 0) {
    const url = rich[0]?.url;
    if (typeof url === 'string' && url.startsWith('http')) return url;
  }

  return undefined;
}

/** YouTube videoId 형식 (11자) 여부 */
function isValidYoutubeVideoId(s: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(s));
}

/** API 썸네일 없을 때만 사용하는 기본 썸네일 URL (유효한 id일 때만) */
function defaultYoutubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

/**
 * YouTube 영상 검색 (api-ninja YouTube Search Scraper)
 * https://apify.com/api-ninja/youtube-search-scraper
 */
export async function searchYouTubeVideos(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string
): Promise<VideoResult[]> {
  try {
    const startTime = Date.now();
    const maxResults = Math.min(limit, 50); // 쇼츠 50개

    const uploadDateMap: Record<string, string> = {
      all: undefined as any,
      yesterday: 'today',
      '7days': 'week',
      '1month': 'month',
      '3months': 'month',
      '6months': 'year',
    };
    const uploadDate = dateRange ? uploadDateMap[dateRange] : undefined;

    // grow_media: queries(배열), videoType | api-ninja: query, type
    const inputParams: Record<string, unknown> = IS_GROW_MEDIA
      ? { queries: [query], maxResults, videoType: 'short' }
      : {
          query,
          maxResults,
          type: 'shorts',
          sortBy: 'relevance',
          ...(uploadDate && { uploadDate }),
        };

    const runRes = await fetchPostWithRetry(
      `https://api.apify.com/v2/acts/${YOUTUBE_ACTOR}/runs?token=${apiKey}`,
      inputParams,
      {},
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    const runData = await runRes.json();
    if (!runRes.ok) {
      console.warn('[Worker:YouTube] Run failed:', runRes.status, runData);
      return [];
    }

    const runId = runData.data?.id;
    if (!runId) return [];

    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 120;
    let waitTime = 500;
    const maxWaitTime = 5000;

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, waitTime));

      const statusRes = await fetchGetWithRetry(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );
      const statusData = await statusRes.json();
      status = statusData.data?.status ?? status;
      attempt++;

      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED') return [];

      waitTime = Math.min(waitTime * 1.5, maxWaitTime);
    }

    if (status !== 'SUCCEEDED') return [];

    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );
    if (!datasetRes.ok) return [];

    const dataset = await datasetRes.json();
    if (!Array.isArray(dataset) || dataset.length === 0) {
      return [];
    }

    // 쇼츠만: type이 shorts/short 이거나, 재생시간 60초 이하 (Shorts 기준)
    const SHORTS_MAX_DURATION_SEC = 60;
    const videoOnly = dataset
      .filter((item: any) => {
        const t = (item.type || '').toLowerCase();
        const isShortsType = t === 'shorts' || t === 'short';
        const durationSec = parseYoutubeDuration(item.duration ?? item.raw?.lengthText);
        const isShortDuration = durationSec > 0 && durationSec <= SHORTS_MAX_DURATION_SEC;
        return isShortsType || (t === 'video' && isShortDuration);
      })
      .slice(0, 50); // 최대 50개

    // 📊 DEBUG: 액터가 썸네일을 보내는지 확인
    if (videoOnly.length > 0) {
      const firstItem = videoOnly[0];
      const extracted = getYoutubeThumbnailUrl(firstItem);
      console.log(`[Worker:YouTube] 📊 Apify 첫 번째 아이템 썸네일:`, {
        query: query.substring(0, 30),
        'item.thumbnail 타입': firstItem.thumbnail == null ? 'null/undefined' : typeof firstItem.thumbnail,
        'item.thumbnail (문자열일 때 앞 80자)': typeof firstItem.thumbnail === 'string' ? firstItem.thumbnail.substring(0, 80) : undefined,
        'item.raw.thumbnail 존재': !!firstItem.raw?.thumbnail,
        'raw.thumbnail 배열 길이': Array.isArray(firstItem.raw?.thumbnail) ? firstItem.raw.thumbnail.length : 0,
        '추출된 URL (우리 로직)': extracted ? extracted.substring(0, 60) + '...' : '없음',
      });
    }

    console.log(
      `[Worker:YouTube] query="${query}" → ${dataset.length} items, videos ${videoOnly.length}`
    );

    const results: VideoResult[] = videoOnly.map((item: any, index: number) => {
      const fromUrl = item.url?.match(/[?&]v=([^&]+)/)?.[1] || item.url?.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)?.[1];
      const rawId = item.id || item.raw?.videoId || fromUrl;
      const videoId = (rawId && isValidYoutubeVideoId(String(rawId)) ? rawId : fromUrl) || `yt-${index}`;
      const durationSec = parseYoutubeDuration(item.duration ?? item.raw?.lengthText);
      const createTime = parseYoutubeDate(item.date ?? item.raw?.publishedAt);
      const validId = isValidYoutubeVideoId(videoId);

      // 썸네일: 액터가 준 URL 그대로 사용(업로더가 지정한 썸네일). 없을 때만 기본 URL 사용
      const apiThumbnail = getYoutubeThumbnailUrl(item);
      const fallbackThumbnail = fromUrl ? defaultYoutubeThumbnailUrl(fromUrl) : (validId ? defaultYoutubeThumbnailUrl(videoId) : undefined);
      const thumbnail = apiThumbnail || fallbackThumbnail;

      if (!thumbnail) {
        console.warn(`[Worker:YouTube] ⚠️ Missing thumbnail:`, { videoId, title: (item.title || item.raw?.title || '').substring(0, 40) });
      }

      return {
        id: videoId,
        title: item.title || item.raw?.title || '',
        description: item.description || item.raw?.description || '',
        creator: item.channelName || item.raw?.channelTitle || 'Unknown',
        creatorUrl: item.channelUrl || (item.raw?.channelId ? `https://www.youtube.com/channel/${item.raw.channelId}` : undefined),
        playCount: parseInt(item.viewCount || item.raw?.viewCount || '0', 10) || 0,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        createTime,
        videoDuration: durationSec,
        hashtags: [],
        thumbnail,
        videoUrl: undefined,
        webVideoUrl: item.url || (validId || fromUrl ? `https://www.youtube.com/watch?v=${fromUrl || videoId}` : undefined),
      };
    });

    const withThumb = results.filter((r) => r.thumbnail).length;
    console.log(`[Worker:YouTube] Completed in ${Date.now() - startTime}ms, returning ${results.length} videos (${withThumb} with thumbnail)`);
    if (withThumb < results.length && results.length > 0) {
      console.warn(`[Worker:YouTube] ⚠️ ${results.length - withThumb} items have no thumbnail — actor may not be sending thumbnail for some items`);
    }
    return results;
  } catch (error) {
    console.error('[Worker:YouTube] Error:', error);
    return [];
  }
}
