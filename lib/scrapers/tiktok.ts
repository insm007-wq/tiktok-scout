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
export interface SearchScraperOptions {
  /** 검색 취소 시 run 중단용으로 runId 전달 */
  onRunStarted?: (runId: string) => void;
  /** 수집 대기 중 진행률 (15~70) — UI에 "아직 수집 중" 표시용 */
  onProgress?: (percent: number) => void;
}

export async function searchTikTokVideos(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string,
  options?: SearchScraperOptions
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
        disableDataset: true,  // ✅ R2 저장 비활성화 (결과만 메모리에 반환)
      },
      {},
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    const runData = await runRes.json();
    if (!runRes.ok) {
      const errorMsg = `[TikTok] Run creation failed: ${runRes.status} ${JSON.stringify(runData)}`
      return [];
    }

    const runId = runData.data.id;
    options?.onRunStarted?.(runId);

    // 2️⃣ 완료 대기 (Polling with exponential backoff)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 120;  // ✅ IMPROVED: Douyin과 일관성 (60→120)
    let waitTime = 500;
    const maxWaitTime = 5000;

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, waitTime));  // ✅ 루프 시작 시 대기

      const statusRes = await fetchGetWithRetry(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`,
        {},
        { maxRetries: 3, initialDelayMs: 1000 }
      );

      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      // 수집 대기 중 진행률 15~70% (완료 전까지 서서히 증가)
      const waitPercent = 15 + Math.floor((55 * attempt) / maxAttempts);
      options?.onProgress?.(Math.min(waitPercent, 70));

      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED') {
        return [];
      }

      // ✅ 다음 폴링을 위해 wait time 증가
      waitTime = Math.min(waitTime * 1.5, maxWaitTime);
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

    if (!datasetRes.ok) {
      const errorMsg = `[TikTok] Dataset fetch failed: ${datasetRes.status}`
      return [];
    }

    const dataset = await datasetRes.json();
    if (!Array.isArray(dataset)) {
      const errorMsg = `[TikTok] Invalid dataset response: ${typeof dataset}`
      return [];
    }

    if (dataset.length === 0) {
      const warnMsg = `[TikTok] No results found for query: "${query}"`
      return [];
    }


    // 결과 변환 (CDN URL 직접 사용, R2 업로드 제거)
    const results = await Promise.all(
      dataset.slice(0, Math.min(limit, 50)).map(async (item: any, index: number) => {
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
        const tiktokThumbnail = item.video?.thumbnail ||
                         item.video?.cover ||
                         item.thumbnail ||
                         item.image ||
                         item.coverImage ||
                         item.videoCover ||
                         item.dynamicCover ||
                         item.staticCover ||
                         item.imagePost?.imageList?.[0]?.imageUrl ||
                         item.imagePostList?.imageList?.[0]?.imageUrl ||
                         (Array.isArray(item.imageList) && item.imageList[0]?.imageUrl) ||
                         (Array.isArray(item.imagePost) && item.imagePost[0]) ||
                         undefined;

        // ✅ CDN URL 수신 (R2 업로드 없음)
        console.log(`[Worker:TikTok] 🖼️ Item 상세 정보`, {
          videoId: item.id || `video-${index}`,
          hasThumbnail: !!tiktokThumbnail,
          thumbnailPreview: tiktokThumbnail ? tiktokThumbnail.substring(0, 60) : 'N/A',
          hasVideo: !!videoUrl,
          itemKeys: Object.keys(item),
          videoFieldKeys: item.video ? Object.keys(item.video) : 'no video field',
          thumbnail: item.thumbnail || 'N/A',
          image: item.image || 'N/A',
          coverImage: item.coverImage || 'N/A',
          videoCover: item.videoCover || 'N/A',
          videoThumbnail: item.video?.thumbnail || 'N/A',
          videoCover2: item.video?.cover || 'N/A',
        });

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
          thumbnail: tiktokThumbnail,
          videoUrl: videoUrl,
          webVideoUrl: webVideoUrl,
        };
      })
    );

    return results;
  } catch (error) {
    return [];
  }
}
