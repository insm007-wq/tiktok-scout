import { VideoResult } from '@/types/video';
import { fetchPostWithRetry, fetchGetWithRetry } from '@/lib/utils/fetch-with-retry';

const ACTOR_ID = 'api-ninja~youtube-search-scraper';

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
    const maxResults = Math.min(limit, 100);

    const uploadDateMap: Record<string, string> = {
      all: undefined as any,
      yesterday: 'today',
      '7days': 'week',
      '1month': 'month',
      '3months': 'month',
      '6months': 'year',
    };
    const uploadDate = dateRange ? uploadDateMap[dateRange] : undefined;

    const inputParams: Record<string, unknown> = {
      query,
      maxResults,
      type: 'video',
      sortBy: 'relevance',
    };
    if (uploadDate) inputParams.uploadDate = uploadDate;

    const runRes = await fetchPostWithRetry(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${apiKey}`,
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

    const videoOnly = dataset.filter((item: any) => (item.type || '').toLowerCase() === 'video');
    console.log(
      `[Worker:YouTube] query="${query}" → ${dataset.length} items, videos ${videoOnly.length}`
    );

    const results: VideoResult[] = videoOnly.slice(0, limit).map((item: any, index: number) => {
      const videoId = item.id || item.raw?.videoId || item.url?.match(/[?&]v=([^&]+)/)?.[1] || `youtube-${index}`;
      const durationSec = parseYoutubeDuration(item.duration ?? item.raw?.lengthText);
      const createTime = parseYoutubeDate(item.date ?? item.raw?.publishedAt);

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
        thumbnail: item.thumbnail || item.raw?.thumbnail?.[0]?.url,
        videoUrl: undefined,
        webVideoUrl: item.url || `https://www.youtube.com/watch?v=${videoId}`,
      };
    });

    console.log(`[Worker:YouTube] Completed in ${Date.now() - startTime}ms, returning ${results.length} videos`);
    return results;
  } catch (error) {
    console.error('[Worker:YouTube] Error:', error);
    return [];
  }
}
