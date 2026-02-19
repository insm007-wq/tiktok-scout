import { fetchPostWithRetry, fetchGetWithRetry } from '@/lib/utils/fetch-with-retry';

interface SingleVideoResult {
  videoUrl?: string;
  webVideoUrl?: string;
  platform: 'tiktok' | 'douyin' | 'xiaohongshu';
  error?: string;
}

/**
 * Fetch video URL using Apify Download Actors
 * - TikTok: epctex/tiktok-video-downloader (highest-rated: 4.9★ 643 reviews)
 * - Douyin: scrapearchitect/douyin-video-downloader
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

    // xiaohongshu: easyapi/rednote-xiaohongshu-video-downloader
    if (platform === 'xiaohongshu') {
      const actorId = 'easyapi~rednote-xiaohongshu-video-downloader';
      const runRes = await fetchPostWithRetry(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
        {
          links: [webVideoUrl.startsWith('http') ? webVideoUrl : `https://www.xiaohongshu.com/explore/${webVideoUrl}`],
          proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
        },
        {},
        { maxRetries: 3, initialDelayMs: 1000 }
      );
      const runData = await runRes.json();
      if (!runRes.ok) {
        console.warn(`[fetchSingleVideoUrl] Xiaohongshu download actor failed:`, runRes.status, runData);
        return { platform, webVideoUrl, error: undefined };
      }
      const runId = runData.data?.id;
      if (!runId) return { platform, webVideoUrl, error: undefined };

      let status = 'RUNNING';
      let attempt = 0;
      let firstAttempt = true;
      while ((status === 'RUNNING' || status === 'READY') && attempt < 60) {
        if (!firstAttempt) {
          await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(1.5, attempt - 1), 5000)));
        }
        firstAttempt = false;
        const statusRes = await fetchGetWithRetry(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`, {}, { maxRetries: 2 });
        const statusData = await statusRes.json();
        status = statusData.data?.status ?? status;
        attempt++;
        if (status === 'SUCCEEDED') break;
        if (status === 'FAILED' || status === 'ABORTED') return { platform, webVideoUrl, error: undefined };
      }

      if (status !== 'SUCCEEDED') return { platform, webVideoUrl, error: undefined };

      const datasetRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`);
      if (!datasetRes.ok) return { platform, webVideoUrl, error: undefined };
      const dataset = await datasetRes.json();
      const item = Array.isArray(dataset) && dataset.length > 0 ? dataset[0] : null;
      const result = item?.result ?? item;
      const medias = result?.medias;
      const mp4Url = Array.isArray(medias) && medias.length > 0
        ? medias.find((m: any) => m.type === 'video' && m.url)?.['url'] ?? medias[0]?.url
        : null;

      if (mp4Url && typeof mp4Url === 'string') {
        console.log(`[fetchSingleVideoUrl] Xiaohongshu: CDN URL from easyapi`);
        return { videoUrl: mp4Url, webVideoUrl, platform };
      }
      return { platform, webVideoUrl, error: undefined };
    }

    // TikTok: Use epctex download actor
    if (platform !== 'tiktok') {
      return { platform, webVideoUrl, error: `${platform}은 단일 영상 URL 조회를 지원하지 않습니다.` };
    }

    const tiktokActorId = 'epctex~tiktok-video-downloader';
    console.log(`[fetchSingleVideoUrl] Using ${platform} download actor: ${tiktokActorId}`);

    // Step 1: Start the actor run
    const runRes = await fetchPostWithRetry(
      `https://api.apify.com/v2/acts/${tiktokActorId}/runs?token=${apiKey}`,
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
