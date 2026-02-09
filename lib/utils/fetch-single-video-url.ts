import { fetchPostWithRetry, fetchGetWithRetry } from '@/lib/utils/fetch-with-retry';
import { searchXiaohongshuVideosParallel } from '@/lib/scrapers/xiaohongshu';
import type { VideoResult } from '@/types/video';

interface SingleVideoResult {
  videoUrl?: string;
  webVideoUrl?: string;
  platform: 'tiktok' | 'douyin' | 'xiaohongshu';
  error?: string;
}

/**
 * Fetch video URL using Apify Download Actors
 * - TikTok: apilabs~tiktok-downloader
 * - Douyin: scrapearchitect~douyin-video-downloader
 * - Xiaohongshu: fallback to search (web-based protection)
 *
 * @param webVideoUrl - The web page URL (e.g., https://www.tiktok.com/@user/video/123456)
 * @param platform - The platform (tiktok, douyin, xiaohongshu)
 * @param apiKey - Apify API key
 * @returns Object with videoUrl (CDN URL) or error
 */
export async function fetchSingleVideoUrl(
  webVideoUrl: string,
  platform: 'tiktok' | 'douyin' | 'xiaohongshu',
  apiKey: string
): Promise<SingleVideoResult> {
  if (!apiKey) {
    return { platform, error: 'APIFY_API_KEY not configured' };
  }

  try {
    console.log(`[fetchSingleVideoUrl] Fetching ${platform} video from URL:`, webVideoUrl);

    // Xiaohongshu: Use search-based fallback (web-based protection prevents direct download)
    if (platform === 'xiaohongshu') {
      console.log(`[fetchSingleVideoUrl] Xiaohongshu: Using search-based approach (web protection)`);

      const match = webVideoUrl.match(/\/explore\/(\w+)/);
      const videoId = match ? match[1] : null;

      if (!videoId) {
        return { platform, webVideoUrl, error: '유효하지 않은 Xiaohongshu URL입니다.' };
      }

      try {
        const results = await searchXiaohongshuVideosParallel(videoId, 3, apiKey);
        if (results.length > 0 && results[0].videoUrl) {
          return { videoUrl: results[0].videoUrl, webVideoUrl: results[0].webVideoUrl || webVideoUrl, platform };
        }
      } catch (e) {
        console.warn(`[fetchSingleVideoUrl] Xiaohongshu search failed, returning web fallback`);
      }

      return {
        platform,
        webVideoUrl,
        error: undefined,  // No error - fallback to browser
      };
    }

    // TikTok & Douyin: Use dedicated download actors
    const actorConfig = {
      'tiktok': {
        actorId: 'apilabs~tiktok-downloader',
        paramName: 'videoUrls',
        urlField: 'downloadUrl',
      },
      'douyin': {
        actorId: 'scrapearchitect~douyin-video-downloader',
        paramName: 'video_urls',
        urlField: 'videoUrl',
      },
    };

    const config = actorConfig[platform];
    if (!config) {
      return { platform, error: `Unsupported platform: ${platform}` };
    }

    console.log(`[fetchSingleVideoUrl] Using ${platform} download actor: ${config.actorId}`);

    // Step 1: Start the actor run
    const runRes = await fetchPostWithRetry(
      `https://api.apify.com/v2/acts/${config.actorId}/runs?token=${apiKey}`,
      platform === 'douyin'
        ? { video_urls: [{ url: webVideoUrl }] }
        : { videoUrls: [webVideoUrl] },
      {},
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    const runData = await runRes.json();
    if (!runRes.ok) {
      const errorMsg = `[${platform}] Actor run failed: ${runRes.status} ${JSON.stringify(runData)}`;
      console.error(errorMsg);
      return { platform, webVideoUrl, error: `비디오 다운로드 링크를 가져올 수 없습니다.` };
    }

    const runId = runData.data.id;
    console.log(`[fetchSingleVideoUrl] Actor run started: ${runId}`);

    // Step 2: Wait for completion with exponential backoff
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 120;  // ~2 minutes max wait
    let waitTime = 500;
    const maxWaitTime = 5000;

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, waitTime));

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
        console.error(`[fetchSingleVideoUrl] Actor run failed: ${status}`);
        return { platform, webVideoUrl, error: `비디오 다운로드에 실패했습니다.` };
      }

      waitTime = Math.min(waitTime * 1.5, maxWaitTime);
    }

    if (status !== 'SUCCEEDED') {
      console.error(`[fetchSingleVideoUrl] Actor run timeout`);
      return { platform, webVideoUrl, error: `비디오 처리 시간 초과` };
    }

    // Step 3: Retrieve dataset items
    const datasetRes = await fetchGetWithRetry(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`,
      {},
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    if (!datasetRes.ok) {
      console.error(`[fetchSingleVideoUrl] Dataset fetch failed: ${datasetRes.status}`);
      return { platform, webVideoUrl, error: `비디오 정보를 가져올 수 없습니다.` };
    }

    const dataset = await datasetRes.json();
    if (!Array.isArray(dataset) || dataset.length === 0) {
      console.error(`[fetchSingleVideoUrl] No results from actor`);
      return { platform, webVideoUrl, error: `비디오를 찾을 수 없습니다. URL이 올바른지 확인해주세요.` };
    }

    const result = dataset[0];
    console.log(`[fetchSingleVideoUrl] Full response:`, JSON.stringify(result, null, 2));
    console.log(`[fetchSingleVideoUrl] Looking for field: ${config.urlField}`);
    console.log(`[fetchSingleVideoUrl] Result[${config.urlField}]:`, result[config.urlField]);
    console.log(`[fetchSingleVideoUrl] result.videoUrl:`, result.videoUrl);
    console.log(`[fetchSingleVideoUrl] result.downloadUrl:`, result.downloadUrl);

    const videoUrl = result[config.urlField] || result.videoUrl || result.downloadUrl;

    if (!videoUrl) {
      console.error(`[fetchSingleVideoUrl] No video URL in response`);
      console.log(`[fetchSingleVideoUrl] Response keys:`, Object.keys(result));
      console.log(`[fetchSingleVideoUrl] All response values:`, result);
      return { platform, webVideoUrl, error: `비디오 다운로드 링크를 가져올 수 없습니다.` };
    }

    console.log(`[fetchSingleVideoUrl] ✅ Video URL extracted successfully: ${videoUrl.substring(0, 80)}`);
    return { videoUrl, webVideoUrl, platform };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[fetchSingleVideoUrl] Error:`, errorMsg);
    return { platform, webVideoUrl, error: `비디오를 가져오는 중 오류 발생: ${errorMsg}` };
  }
}
