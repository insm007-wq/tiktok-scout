import { VideoResult } from '@/types/video';
import { fetchPostWithRetry, fetchGetWithRetry } from '@/lib/utils/fetch-with-retry';

/**
 * Douyin 영상 검색 (natanielsantos Douyin Scraper)
 * 검색 → 폴링 → 결과 조회
 *
 * ✅ 429 Rate Limit 자동 재시도 (Exponential Backoff)
 */
export async function searchDouyinVideos(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string
): Promise<VideoResult[]> {
  try {
    const actorId = 'natanielsantos~douyin-scraper';
    const startTime = Date.now();

    // 날짜 범위 매핑 (Douyin: all, last_day, last_week, last_half_year)
    const mapSearchPublishTimeFilter = (uploadPeriod?: string): string => {
      const mapping: Record<string, string> = {
        'all': 'all',
        'yesterday': 'last_day',
        '7days': 'last_week',
        '6months': 'last_half_year',
      };
      return mapping[uploadPeriod || 'all'] || 'all';
    };

    // 1️⃣ Run 시작 (429 에러 시 자동 재시도)
    const inputParams: any = {
      searchTermsOrHashtags: [query],
      searchSortFilter: 'most_liked',
      searchPublishTimeFilter: mapSearchPublishTimeFilter(dateRange),
      maxItemsPerUrl: 50,
      shouldDownloadVideos: true,  // videoUrl 포함을 위해 true로 설정 (호버 시 즉시 재생 가능)
      shouldDownloadCovers: false,
    };


    const runRes = await fetchPostWithRetry(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
      inputParams,
      {},
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    const runData = await runRes.json();
    if (!runRes.ok) {
      const errorMsg = `[Douyin] Run creation failed: ${runRes.status} ${JSON.stringify(runData)}`
      return [];
    }

    const runId = runData.data.id;

    // 2️⃣ 완료 대기 (Polling with retry)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 120;
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

      if (attempt % 10 === 0) {
      }

      if (status === 'SUCCEEDED') {
        break;
      }
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

    // 3️⃣ 결과 조회
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );

    const dataset = await datasetRes.json();

    if (!Array.isArray(dataset) || dataset.length === 0) {
      return [];
    }

    // 결과 변환
    const results = dataset.slice(0, limit).map((item: any, index: number) => {
      const hashtags = item.hashtags?.map((h: any) => typeof h === 'string' ? h : h.name) || [];


      return {
        id: item.id || `douyin-video-${index}`,
        title: item.text || item.desc || item.description || `영상 ${index + 1}`,
        description: item.text || item.desc || '',
        creator: item.authorMeta?.name || item.authorName || 'Unknown',
        creatorUrl: item.authorMeta?.avatarLarge || item.authorUrl || undefined,
        followerCount: item.authorMeta?.followersCount ? parseInt(item.authorMeta.followersCount) : undefined,
        playCount: parseInt(item.statistics?.diggCount || 0),
        likeCount: parseInt(item.statistics?.diggCount || 0),
        commentCount: parseInt(item.statistics?.commentCount || 0),
        shareCount: parseInt(item.statistics?.shareCount || 0),
        createTime: item.createTime ? parseInt(item.createTime) * 1000 : Date.now(),
        videoDuration: parseInt(item.videoMeta?.duration || item.duration || 0),
        hashtags: hashtags,
        thumbnail: item.videoMeta?.cover || item.videoMeta?.originCover || item.thumb || undefined,
        videoUrl: item.videoMeta?.playUrl || item.video?.url || item.downloadUrl || item.playUrl || undefined,
        webVideoUrl: item.url || undefined,
      };
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    return results;
  } catch (error) {
    return [];
  }
}

/**
 * Douyin 영상 검색 (3개 정렬 병렬 실행)
 * 인기순(most_liked) + 최신순(most_recent) + 관련성순(most_relevant)
 * → 150개 raw → 60-80개 unique → 50개 반환
 */
export async function searchDouyinVideosParallel(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string
): Promise<VideoResult[]> {
  try {
    const actorId = 'natanielsantos~douyin-scraper';
    const startTime = Date.now();

    // 날짜 범위 매핑 (Douyin: all, last_day, last_week, last_half_year)
    const mapSearchPublishTimeFilter = (uploadPeriod?: string): string => {
      const mapping: Record<string, string> = {
        'all': 'all',
        'yesterday': 'last_day',
        '7days': 'last_week',
        '6months': 'last_half_year',
      };
      return mapping[uploadPeriod || 'all'] || 'all';
    };

    // 🔑 3가지 정렬 옵션으로 다양한 결과 확보
    const sortFilters = ['most_liked', 'latest', 'general'];


    // 1️⃣ 3개 Run 동시 시작 (각각 다른 정렬)
    const runPromises = sortFilters.map(async (sortFilter) => {
      const inputParams: any = {
        searchTermsOrHashtags: [query],
        searchSortFilter: sortFilter,  // 🔑 each run uses different sort
        searchPublishTimeFilter: mapSearchPublishTimeFilter(dateRange),
        maxItemsPerUrl: 17,  // 각 Run당 17개 (3개 × 17 = 51개 → 중복 제거 후 ~47개)
        shouldDownloadVideos: false,  // 속도 우선 (비디오 다운로드 안 함)
        shouldDownloadCovers: false,
      };

      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputParams),
        }
      );

      const runData = await runRes.json();
      if (!runRes.ok) {
        return { runId: null, sortFilter };
      }

      return { runId: runData.data.id, sortFilter };
    });

    const runs = await Promise.all(runPromises);
    const validRuns = runs.filter(r => r.runId !== null);

    if (validRuns.length === 0) {
      return [];
    }

    // 2️⃣ 모든 Run 병렬 폴링
    const datasetPromises = validRuns.map(async ({ runId, sortFilter }) => {
      let status = 'RUNNING';
      let attempt = 0;
      const maxAttempts = 120;
      let waitTime = 500;
      const maxWaitTime = 5000;

      while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, waitTime));

        const statusRes = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
        );
        const statusData = await statusRes.json();
        status = statusData.data.status;
        attempt++;

        if (attempt % 10 === 0) {
        }

        if (status === 'SUCCEEDED') {
          break;
        }
        if (status === 'FAILED' || status === 'ABORTED') {
          return [];
        }

        waitTime = Math.min(waitTime * 1.5, maxWaitTime);
      }

      if (status !== 'SUCCEEDED') {
        return [];
      }

      // 결과 조회
      const datasetRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
      );
      const dataset = await datasetRes.json();
      return Array.isArray(dataset) ? dataset : [];
    });

    const datasets = await Promise.all(datasetPromises);

    // 3️⃣ 결과 병합 및 중복 제거 (ID 기준)
    const allItems = datasets.flat();
    const uniqueItems = Array.from(
      new Map(allItems.map(item => [item.id, item])).values()
    );


    if (uniqueItems.length === 0) {
      return [];
    }

    // 4️⃣ VideoResult로 변환 (기존 변환 로직 재사용)
    const results = uniqueItems.slice(0, limit).map((item: any, index: number) => {
      const hashtags = item.hashtags?.map((h: any) => typeof h === 'string' ? h : h.name) || [];

      return {
        id: item.id || `douyin-video-${index}`,
        title: item.text || item.desc || item.description || `영상 ${index + 1}`,
        description: item.text || item.desc || '',
        creator: item.authorMeta?.name || item.authorName || 'Unknown',
        creatorUrl: item.authorMeta?.avatarLarge || item.authorUrl || undefined,
        followerCount: item.authorMeta?.followersCount ? parseInt(item.authorMeta.followersCount) : undefined,
        playCount: parseInt(item.statistics?.diggCount || 0),
        likeCount: parseInt(item.statistics?.diggCount || 0),
        commentCount: parseInt(item.statistics?.commentCount || 0),
        shareCount: parseInt(item.statistics?.shareCount || 0),
        createTime: item.createTime ? parseInt(item.createTime) * 1000 : Date.now(),
        videoDuration: parseInt(item.videoMeta?.duration || item.duration || 0),
        hashtags: hashtags,
        thumbnail: item.videoMeta?.cover || item.videoMeta?.originCover || item.thumb || undefined,
        videoUrl: item.videoMeta?.playUrl || item.video?.url || item.downloadUrl || item.playUrl || undefined,
        webVideoUrl: item.url || undefined,
      };
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    return results;
  } catch (error) {
    return [];
  }
}
