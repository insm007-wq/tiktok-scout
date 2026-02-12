import { fetchPostWithRetry, fetchGetWithRetry } from '@/lib/utils/fetch-with-retry';

interface SingleVideoResult {
  videoUrl?: string;
  webVideoUrl?: string;
  platform: 'tiktok' | 'douyin' | 'youtube';
  error?: string;
}

/**
 * Fetch video URL using Apify Download Actors
 * - TikTok: epctex/tiktok-video-downloader (highest-rated: 4.9★ 643 reviews)
 * - Douyin: scrapearchitect/douyin-video-downloader
 * - YouTube: embed URL 반환 (iframe 미리보기)
 *
 * @param webVideoUrl - The web page URL (e.g., https://www.tiktok.com/@user/video/123456)
 * @param platform - The platform (tiktok, douyin, youtube)
 * @param apiKey - Apify API key
 * @returns Object with videoUrl (CDN URL) or error
 */
export async function fetchSingleVideoUrl(
  webVideoUrl: string,
  platform: 'tiktok' | 'douyin' | 'youtube',
  apiKey: string
): Promise<SingleVideoResult> {
  if (!apiKey) {
    return { platform, error: 'APIFY_API_KEY not configured' };
  }

  try {
    console.log(`[fetchSingleVideoUrl] Fetching ${platform} video from URL:`, webVideoUrl);

    // YouTube: embed URL로 미리보기 (iframe 재생)
    if (platform === 'youtube') {
      const videoId =
        webVideoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1] ||
        webVideoUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/)?.[1];
      if (!videoId) {
        return { platform, webVideoUrl, error: '유효한 YouTube 영상 URL이 아닙니다.' };
      }
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      console.log(`[fetchSingleVideoUrl] YouTube: embed URL for preview`);
      return {
        videoUrl: embedUrl,
        webVideoUrl: webVideoUrl.startsWith('http') ? webVideoUrl : `https://www.youtube.com/watch?v=${videoId}`,
        platform,
      };
    }

    // TikTok: Use epctex download actor
    if (platform !== 'tiktok') {
      return { platform, webVideoUrl, error: `${platform}은 단일 영상 URL 조회를 지원하지 않습니다.` };
    }

    const actorConfig = {
      'tiktok': {
        actorId: 'epctex~tiktok-video-downloader',
        paramName: 'startUrls',
        urlField: 'downloadUrl',
      },
    };

    const config = actorConfig['tiktok'];

    console.log(`[fetchSingleVideoUrl] Using ${platform} download actor: ${config.actorId}`);

    // Step 1: Start the actor run
    const runRes = await fetchPostWithRetry(
      `https://api.apify.com/v2/acts/${config.actorId}/runs?token=${apiKey}`,
      {
        startUrls: [webVideoUrl],
        proxy: { useApifyProxy: true },  // Required for epctex TikTok actor
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
    console.log(`[fetchSingleVideoUrl] ✅ Full response:`, JSON.stringify(result, null, 2));
    console.log(`[fetchSingleVideoUrl] All available keys:`, Object.keys(result));
    console.log(`[fetchSingleVideoUrl] Looking for field: ${config.urlField}`);
    console.log(`[fetchSingleVideoUrl] Result[${config.urlField}]:`, result[config.urlField]);
    console.log(`[fetchSingleVideoUrl] result.downloadUrl:`, result.downloadUrl);
    console.log(`[fetchSingleVideoUrl] result.videoUrl:`, result.videoUrl);
    console.log(`[fetchSingleVideoUrl] result.videourl:`, result.videourl);
    console.log(`[fetchSingleVideoUrl] result.downloadAddress:`, result.downloadAddress);

    // Enhanced videoUrl extraction with multiple fallbacks for different actor response formats
    const videoUrl =
      result[config.urlField] ||     // Priority 1: configured field
      result.videoUrl ||              // Priority 2: videoUrl (uppercase)
      result.videourl ||              // Priority 3: videourl (lowercase for douyin)
      result.downloadUrl ||           // Priority 4: downloadUrl (epctex fallback)
      result.downloadAddress;         // Priority 5: downloadAddress (epctex alternative)

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
