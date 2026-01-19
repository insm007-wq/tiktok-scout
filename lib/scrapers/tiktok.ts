import { VideoResult } from '@/types/video';
import { fetchWithRetry, fetchPostWithRetry, fetchGetWithRetry } from '@/lib/utils/fetch-with-retry';

/**
 * TikTok 영상 검색 (Api Dojo TikTok Scraper)
 * ⭐ 최고 평점 (4.8/5), 가장 정확하고 빠름
 *
 * ✅ 429 Rate Limit 자동 재시도 (Exponential Backoff)
 * - 최대 3회 재시도
 * - 1초, 2초, 4초... 대기
 */
export async function searchTikTokVideos(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string
): Promise<VideoResult[]> {
  try {
    const actorId = 'apidojo~tiktok-scraper';
    const startTime = Date.now();

    // 날짜 범위 매핑
    const mapDateRange = (uploadPeriod?: string): string => {
      const mapping: Record<string, string> = {
        'all': 'DEFAULT',
        'yesterday': 'YESTERDAY',
        '7days': 'THIS_WEEK',
        '1month': 'THIS_MONTH',
        '3months': 'LAST_THREE_MONTHS',
      };
      return mapping[uploadPeriod || 'all'] || 'DEFAULT';
    };

    // 1️⃣ Run 시작 (429 에러 시 자동 재시도)
    const runRes = await fetchPostWithRetry(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
      {
        keywords: [query],
        maxItems: 50,
        sortType: 'RELEVANCE',
        location: 'US',
        dateRange: mapDateRange(dateRange),
        includeSearchKeywords: false,
        startUrls: [],
      },
      {},
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    const runData = await runRes.json();
    if (!runRes.ok) {
      return [];
    }

    const runId = runData.data.id;

    // 2️⃣ 완료 대기 (Polling with retry)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 60;
    let waitTime = 500;
    const maxWaitTime = 5000;

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      const statusRes = await fetchGetWithRetry(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`,
        {},
        { maxRetries: 3, initialDelayMs: 1000 }
      );

      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED') {
        return [];
      }

      if (status === 'RUNNING' || status === 'READY') {
        await new Promise(r => setTimeout(r, waitTime));
        waitTime = Math.min(waitTime * 2, maxWaitTime);
      }
    }

    if (status !== 'SUCCEEDED') {
      return [];
    }

    // 3️⃣ 결과 조회 (429 에러 시 자동 재시도)
    const datasetRes = await fetchGetWithRetry(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`,
      {},
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    const dataset = await datasetRes.json();
    if (!Array.isArray(dataset) || dataset.length === 0) {
      return [];
    }

    // 결과 변환
    const results = dataset.slice(0, Math.min(limit, 50)).map((item: any, index: number) => {
      const hashtags = Array.isArray(item.hashtags)
        ? item.hashtags
            .filter((h: any) => h !== null && h !== undefined)
            .map((h: any) => typeof h === 'string' ? h : (h && h.name ? h.name : h))
        : [];

      const videoUrl = item.video?.url || item.downloadUrl || item.videoUrl || undefined;
      const webVideoUrl = item.postPage ||
                         (item.channel?.url && item.id ? `${item.channel.url}/video/${item.id}` : undefined) ||
                         undefined;

      // 썸네일 필드 여러 경로 시도
      const thumbnail = item.video?.thumbnail ||
                       item.video?.cover ||
                       item.thumbnail ||
                       item.image ||
                       item.coverImage ||
                       item.videoCover ||
                       undefined;

      return {
        id: item.id || `video-${index}`,
        title: item.title || `영상 ${index + 1}`,
        description: item.title || '',
        creator: item.channel?.name || item.channel?.username || 'Unknown',
        creatorUrl: item.channel?.url || undefined,
        followerCount: item.channel?.followers ? parseInt(String(item.channel.followers)) : undefined,
        playCount: parseInt(String(item.views || 0)),
        likeCount: parseInt(String(item.likes || 0)),
        commentCount: parseInt(String(item.comments || 0)),
        shareCount: parseInt(String(item.shares || 0)),
        createTime: item.uploadedAt ? parseInt(String(item.uploadedAt)) * 1000 : Date.now(),
        videoDuration: item.video?.duration ? parseInt(String(item.video.duration)) : 0,
        hashtags: hashtags,
        thumbnail: thumbnail,
        videoUrl: videoUrl,
        webVideoUrl: webVideoUrl,
      };
    });

    const duration = Date.now() - startTime;

    return results;
  } catch (error) {
    return [];
  }
}
