import { fetchPostWithRetry, fetchGetWithRetry } from './fetch-with-retry';

interface SingleVideoResult {
  videoUrl?: string;
  webVideoUrl?: string;
  platform: 'tiktok' | 'douyin' | 'xiaohongshu';
  error?: string;
}

/**
 * Fetch a single video URL from Apify using the video's web page URL
 * Used for direct downloads when user provides a TikTok/Douyin/Xiaohongshu URL
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

    let actorId: string;
    let startUrl: string;

    // Select appropriate Apify actor based on platform
    if (platform === 'tiktok') {
      actorId = 'apidojo~tiktok-scraper';
      startUrl = webVideoUrl;
    } else if (platform === 'douyin') {
      actorId = 'apidojo~douyin-scraper';
      startUrl = webVideoUrl;
    } else if (platform === 'xiaohongshu') {
      actorId = 'apidojo~xiaohongshu-scraper';
      startUrl = webVideoUrl;
    } else {
      return { platform, error: `Unknown platform: ${platform}` };
    }

    // Step 1: Start Apify run with direct URL
    const runRes = await fetchPostWithRetry(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
      {
        startUrls: [{ url: startUrl }],
        maxItems: 1,  // Only fetch 1 video
        disableDataset: true,  // Keep results in memory
      },
      {},
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    const runData = await runRes.json();
    if (!runRes.ok) {
      console.error(`[fetchSingleVideoUrl] Run creation failed:`, runData);
      return { platform, error: `Apify run creation failed: ${runRes.status}` };
    }

    const runId = runData.data.id;
    console.log(`[fetchSingleVideoUrl] Apify run started:`, runId);

    // Step 2: Wait for completion (poll status)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 120;  // Max 2 minutes wait
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

      console.log(`[fetchSingleVideoUrl] Status check ${attempt}/${maxAttempts}:`, status);

      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED') {
        console.error(`[fetchSingleVideoUrl] Apify run ${status}`);
        return { platform, error: `Apify run ${status}` };
      }

      waitTime = Math.min(waitTime * 1.5, maxWaitTime);
    }

    if (status !== 'SUCCEEDED') {
      console.error(`[fetchSingleVideoUrl] Timeout: status is still ${status}`);
      return { platform, error: `Timeout waiting for Apify results` };
    }

    // Step 3: Fetch results
    const datasetRes = await fetchGetWithRetry(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`,
      {},
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    if (!datasetRes.ok) {
      console.error(`[fetchSingleVideoUrl] Dataset fetch failed:`, datasetRes.status);
      return { platform, error: `Failed to fetch Apify results: ${datasetRes.status}` };
    }

    const dataset = await datasetRes.json();
    if (!Array.isArray(dataset) || dataset.length === 0) {
      console.error(`[fetchSingleVideoUrl] No results from Apify`);
      return { platform, webVideoUrl, error: 'No video data found' };
    }

    const videoData = dataset[0];
    console.log(`[fetchSingleVideoUrl] Video data fetched, keys:`, Object.keys(videoData));

    // Extract video URL from Apify results
    const videoUrl = videoData.video?.url ||
                     videoData.downloadUrl ||
                     videoData.videoUrl ||
                     videoData.media?.url ||
                     undefined;

    if (!videoUrl) {
      console.error(`[fetchSingleVideoUrl] No video URL found in Apify response`);
      return { platform, webVideoUrl, error: 'Could not extract video URL from page' };
    }

    console.log(`[fetchSingleVideoUrl] ✅ Video URL extracted successfully`);
    return { videoUrl, webVideoUrl, platform };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[fetchSingleVideoUrl] Error:`, errorMsg);
    return { platform, error: `Error fetching video URL: ${errorMsg}` };
  }
}
