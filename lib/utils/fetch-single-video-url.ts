import { fetchPostWithRetry, fetchGetWithRetry } from '@/lib/utils/fetch-with-retry';

interface SingleVideoResult {
  videoUrl?: string;
  webVideoUrl?: string;
  platform: 'tiktok' | 'douyin';
  error?: string;
}

/**
 * Fetch video URL using download actors
 *
 * @param webVideoUrl - The web page URL (e.g., https://www.tiktok.com/@user/video/123456)
 * @param platform - The platform (tiktok, douyin)
 * @param apiKey - API key
 * @returns Object with videoUrl (CDN URL) or error
 */
export async function fetchSingleVideoUrl(
  webVideoUrl: string,
  platform: 'tiktok' | 'douyin',
  apiKey: string
): Promise<SingleVideoResult> {
  if (!apiKey) {
    return { platform, error: 'APIFY_API_KEY not configured' };
  }

  try {
    console.log(`[fetchSingleVideoUrl] Fetching ${platform} video from URL:`, webVideoUrl);

    // TikTok only: Douyin single-video URL fetch not supported here
    if (platform !== 'tiktok') {
      return { platform, webVideoUrl, error: `${platform}은 단일 영상 URL 조회를 지원하지 않습니다.` };
    }

    const tiktokActorId = 'epctex~tiktok-video-downloader';
    console.log(`[fetchSingleVideoUrl] Using ${platform} download actor`);

    // Step 1: Start the actor run
    const runRes = await fetchPostWithRetry(
      `https://api.apify.com/v2/acts/${tiktokActorId}/runs?token=${apiKey}`,
      {
        startUrls: [webVideoUrl],
        proxy: { useApifyProxy: true },  // Required for TikTok actor
      },
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
      console.error(`[fetchSingleVideoUrl] ❌ No results from actor`);
      console.error(`[fetchSingleVideoUrl] Dataset response:`, JSON.stringify(dataset));
      return { platform, webVideoUrl, error: `비디오를 찾을 수 없습니다. URL이 올바른지 확인해주세요.` };
    }

    const result = dataset[0];

    // Enhanced videoUrl extraction with multiple fallbacks for different actor response formats
    const videoUrl =
      result.videoUrl ||              // Priority 1: videoUrl (uppercase)
      result.videourl ||              // Priority 2: videourl (lowercase for douyin)
      result.downloadUrl ||           // Priority 3: downloadUrl (epctex fallback)
      result.downloadAddress;         // Priority 4: downloadAddress (epctex alternative)

    if (!videoUrl) {
      console.error(`[fetchSingleVideoUrl] No video URL in response`);
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
