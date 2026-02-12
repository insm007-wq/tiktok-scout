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

    // Xiaohongshu: Video Downloader 액터로 CDN URL 추출 후 다운로드 가능
    if (platform === 'xiaohongshu') {
      // 액터 호환용: explore/ID 형태로 정규화 (쿼리 제거)
      const exploreMatch = webVideoUrl.match(/xiaohongshu\.com\/explore\/([a-zA-Z0-9]+)/);
      const canonicalUrl = exploreMatch
        ? `https://www.xiaohongshu.com/explore/${exploreMatch[1]}`
        : webVideoUrl;
      console.log(`[fetchSingleVideoUrl] Xiaohongshu: Using Video Downloader actor for URL:`, canonicalUrl);

      const actorId = 'easyapi~rednote-xiaohongshu-video-downloader';
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ links: [canonicalUrl] }),
        }
      );

      if (!runRes.ok) {
        const errText = await runRes.text();
        console.error(`[fetchSingleVideoUrl] Xiaohongshu actor start failed:`, runRes.status, errText);
        // 402 = Payment/Rental required → 액터 구독(렌탈) 필요
        if (runRes.status === 402) {
          return {
            platform,
            webVideoUrl,
            error: '샤오홍슈 다운로드 액터 구독이 필요합니다. Apify에서 "RedNote Xiaohongshu Video Downloader" 액터를 렌탈($19.99/월)해 주세요.',
          };
        }
        let detail = '샤오홍슈 영상 URL을 가져오지 못했습니다.';
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error?.message) detail = errJson.error.message;
        } catch (_) {}
        return { platform, webVideoUrl, error: detail };
      }

      const runData = await runRes.json();
      const runId = runData.data.id;

      let status = 'RUNNING';
      let attempt = 0;
      const maxAttempts = 60;
      let waitTime = 1000;

      while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, waitTime));
        const statusRes = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
        );
        const statusData = await statusRes.json();
        status = statusData.data?.status || 'UNKNOWN';
        attempt++;
        if (status === 'SUCCEEDED') break;
        if (status === 'FAILED' || status === 'ABORTED') {
          return { platform, webVideoUrl, error: '샤오홍슈 영상 추출에 실패했습니다.' };
        }
        waitTime = Math.min(waitTime + 500, 5000);
      }

      if (status !== 'SUCCEEDED') {
        return { platform, webVideoUrl, error: '샤오홍슈 영상 처리 시간이 초과되었습니다.' };
      }

      const datasetRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
      );
      if (!datasetRes.ok) {
        return { platform, webVideoUrl, error: '샤오홍슈 영상 정보를 가져오지 못했습니다.' };
      }

      const dataset = await datasetRes.json();
      const result = Array.isArray(dataset) && dataset.length > 0 ? dataset[0] : null;
      const medias = result?.result?.medias ?? result?.medias ?? [];
      if (!Array.isArray(medias) || medias.length === 0) {
        console.warn('[fetchSingleVideoUrl] Xiaohongshu: no medias in result', result ? Object.keys(result) : 'null');
        return {
          platform,
          webVideoUrl,
          error: '이 포스트에는 영상이 없을 수 있습니다. 이미지 전용 포스트는 다운로드할 수 없습니다. 샤오홍슈에서 직접 확인해 주세요.',
        };
      }

      const videoMedia = medias.find((m: any) => m.type === 'video') ?? medias.find((m: any) => m.url && (m.type !== 'image'));
      const videoUrl = videoMedia?.url ?? videoMedia?.videoUrl;
      if (!videoUrl) {
        return {
          platform,
          webVideoUrl,
          error: '이 포스트에는 영상이 없을 수 있습니다. 이미지 전용 포스트는 다운로드할 수 없습니다.',
        };
      }

      console.log(`[fetchSingleVideoUrl] Xiaohongshu video URL extracted`);
      return { videoUrl, webVideoUrl, platform };
    }

    // TikTok: Use epctex download actor
    // Only TikTok download is supported
    if (platform !== 'tiktok') {
      return { platform, webVideoUrl, error: `${platform}은 다운로드를 지원하지 않습니다. TikTok만 다운로드 가능합니다.` };
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
