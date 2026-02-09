import { searchTikTokVideos } from '@/lib/scrapers/tiktok';
import { searchDouyinVideosParallel } from '@/lib/scrapers/douyin';
import { searchXiaohongshuVideosParallel } from '@/lib/scrapers/xiaohongshu';
import type { VideoResult } from '@/types/video';

interface SingleVideoResult {
  videoUrl?: string;
  webVideoUrl?: string;
  platform: 'tiktok' | 'douyin' | 'xiaohongshu';
  error?: string;
}

/**
 * Extract video ID from platform URL
 * @param url - The web page URL
 * @returns Video ID or null
 */
function extractVideoIdFromUrl(url: string): string | null {
  try {
    // TikTok: /video/7595183372683463957
    let match = url.match(/\/video\/(\d+)/);
    if (match) return match[1];

    // Douyin: /aweme/detail/7595183372683463957
    match = url.match(/\/aweme\/detail\/(\d+)/);
    if (match) return match[1];

    // Xiaohongshu: /explore/1234567890
    match = url.match(/\/explore\/(\w+)/);
    if (match) return match[1];

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract creator username from platform URL
 * @param url - The web page URL
 * @returns Creator username or null
 */
function extractCreatorUsername(url: string): string | null {
  try {
    const match = url.match(/@([^\/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Fetch a single video URL from Apify using keyword search
 * Used for direct downloads when user provides a TikTok/Douyin/Xiaohongshu URL
 *
 * Key improvement: Uses search API with video ID as keyword instead of startUrls
 * - ✅ Search API (keywords) is optimized and returns videoUrl
 * - ❌ startUrls approach doesn't return video data for search-optimized actors
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

    // Step 1: Extract video ID from URL
    const videoId = extractVideoIdFromUrl(webVideoUrl);
    if (!videoId) {
      console.error(`[fetchSingleVideoUrl] Could not extract video ID from URL`);
      return { platform, webVideoUrl, error: '유효하지 않은 URL입니다. 비디오 링크를 확인해주세요.' };
    }

    console.log(`[fetchSingleVideoUrl] Extracted video ID: ${videoId}`);

    // Step 2: Extract creator username for better search accuracy
    const username = extractCreatorUsername(webVideoUrl);
    const searchQuery = username ? `@${username} ${videoId}` : videoId;

    console.log(`[fetchSingleVideoUrl] Using search query: ${searchQuery}`);

    // Step 3: Search using platform-specific search function
    let results: VideoResult[] = [];

    if (platform === 'tiktok') {
      results = await searchTikTokVideos(searchQuery, 3, apiKey);
    } else if (platform === 'douyin') {
      results = await searchDouyinVideosParallel(searchQuery, 3, apiKey);
    } else if (platform === 'xiaohongshu') {
      results = await searchXiaohongshuVideosParallel(searchQuery, 3, apiKey);
    } else {
      return { platform, error: `Unknown platform: ${platform}` };
    }

    console.log(`[fetchSingleVideoUrl] Search returned ${results.length} results`);

    // Step 4: Find matching video by ID
    const match = results.find(v => v.id === videoId);

    if (!match) {
      console.error(`[fetchSingleVideoUrl] Video ID ${videoId} not found in search results`);
      return {
        platform,
        webVideoUrl,
        error: '비디오를 찾을 수 없습니다. URL이 올바른지 확인해주세요.',
      };
    }

    // Step 5: Extract video URL from match
    const videoUrl = match.videoUrl;

    if (!videoUrl) {
      console.warn(`[fetchSingleVideoUrl] Video found but no videoUrl - platform: ${platform}, videoId: ${videoId}`);

      // Handle platform-specific cases where videoUrl is not available
      if (platform === 'xiaohongshu') {
        console.log(`[fetchSingleVideoUrl] Xiaohongshu: videoUrl not available, returning webVideoUrl for browser fallback`);
        return {
          platform,
          webVideoUrl: match.webVideoUrl || webVideoUrl,
          error: undefined,  // No error - this is expected for Xiaohongshu
        };
      }

      return {
        platform,
        webVideoUrl,
        error: '비디오 다운로드 링크를 가져올 수 없습니다.',
      };
    }

    console.log(`[fetchSingleVideoUrl] ✅ Video URL extracted successfully`);
    return { videoUrl, webVideoUrl: match.webVideoUrl || webVideoUrl, platform };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[fetchSingleVideoUrl] Error:`, errorMsg);
    return { platform, error: `비디오를 가져오는 중 오류 발생: ${errorMsg}` };
  }
}
