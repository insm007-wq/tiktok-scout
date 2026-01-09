import { VideoResult } from '@/types/video';

/**
 * Douyin 영상 검색 (natanielsantos Douyin Scraper)
 * 검색 → 폴링 → 결과 조회
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
    console.log(`[Douyin] 검색 시작: ${query} (제한: ${limit}, 기간: ${dateRange || 'all'})`);

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

    // 1️⃣ Run 시작
    const inputParams: any = {
      searchTermsOrHashtags: [query],
      searchSortFilter: 'most_liked',
      searchPublishTimeFilter: mapSearchPublishTimeFilter(dateRange),
      maxItemsPerUrl: 50,
      shouldDownloadVideos: false,  // 테스트: 비디오 URL 다운로드 비활성화
      shouldDownloadCovers: false,
    };

    const runStartTime = Date.now();

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
      console.error('[Douyin] Run 시작 실패:', runData);
      return [];
    }

    const runId = runData.data.id;
    const runCreatedTime = Date.now();
    console.log(`[Douyin] Run ID: ${runId}`);

    // 2️⃣ 완료 대기 (Polling)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 120;  // 충분한 시간 확보 (비디오 URL 다운로드)
    let waitTime = 500;
    const maxWaitTime = 5000;

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );

      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      console.log(`[Douyin] Polling 시도 ${attempt}/${maxAttempts}: 상태=${status}`);

      if (status === 'SUCCEEDED') {
        console.log('[Douyin] Run 완료됨');
        break;
      }
      if (status === 'FAILED' || status === 'ABORTED') {
        console.error('[Douyin] Run 실패:', statusData.data.statusMessage);
        return [];
      }

      if (status === 'RUNNING' || status === 'READY') {
        await new Promise(r => setTimeout(r, waitTime));
        waitTime = Math.min(waitTime * 2, maxWaitTime);
      }
    }

    if (status !== 'SUCCEEDED') {
      console.warn(`[Douyin] 타임아웃 (상태: ${status})`);
      return [];
    }

    const pollingCompleteTime = Date.now();

    // 3️⃣ 결과 조회
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );

    const dataset = await datasetRes.json();
    console.log(`[Douyin] API 응답 데이터: ${Array.isArray(dataset) ? dataset.length : 0}개`);

    if (!Array.isArray(dataset) || dataset.length === 0) {
      console.log('[Douyin] 검색 결과 없음');
      return [];
    }

    // 결과 변환
    const results = dataset.slice(0, limit).map((item: any, index: number) => {
      if (index === 0) {
        console.log(`[Douyin] 첫 번째 아이템:`, { id: item.id, text: item.text, duration: item.videoMeta?.duration });
      }
      const hashtags = item.hashtags?.map((h: any) => typeof h === 'string' ? h : h.name) || [];

      // videoDuration 로깅 (처음 3개만)
      if (index < 3) {
        console.log(`[Douyin] 영상 ${index + 1} duration 데이터:`, {
          duration: item.duration,
          videoMetaDuration: item.videoMeta?.duration,
          type: typeof (item.videoMeta?.duration || item.duration),
          parsed: parseInt(item.videoMeta?.duration || item.duration || 0)
        });
      }

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
    console.log(`[Douyin] ✅ 완료: ${results.length}개 (${(duration / 1000).toFixed(2)}초)`);

    return results;
  } catch (error) {
    console.error('[Douyin] 오류:', error);
    return [];
  }
}

/**
 * Douyin 비디오 URL만 추가로 가져오기 (shouldDownloadVideos: true)
 */
export async function fetchDouyinVideoUrls(
  query: string,
  apiKey: string,
  dateRange?: string
): Promise<Map<string, string>> {
  const actorId = 'natanielsantos~douyin-scraper';

  console.log(`[Douyin VideoURLs] 비디오 URL 가져오기 시작: ${query}`);

  const mapSearchPublishTimeFilter = (uploadPeriod?: string): string => {
    const mapping: Record<string, string> = {
      'all': 'all',
      'yesterday': 'last_day',
      '7days': 'last_week',
      '6months': 'last_half_year',
    };
    return mapping[uploadPeriod || 'all'] || 'all';
  };

  const inputParams: any = {
    searchTermsOrHashtags: [query],
    searchSortFilter: 'most_liked',
    searchPublishTimeFilter: mapSearchPublishTimeFilter(dateRange),
    maxItemsPerUrl: 50,
    shouldDownloadVideos: true,  // ← 비디오 URL 포함
    shouldDownloadCovers: false,
  };

  try {
    // Run 시작
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
      console.error('[Douyin VideoURLs] Run 시작 실패:', runData);
      return new Map();
    }

    const runId = runData.data.id;
    console.log(`[Douyin VideoURLs] Run ID: ${runId}`);

    // Polling (충분한 시간 확보)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 120;
    let waitTime = 500;
    const maxWaitTime = 5000;

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );

      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      if (attempt % 10 === 0) {
        console.log(`[Douyin VideoURLs] Polling ${attempt}/${maxAttempts}: ${status}`);
      }

      if (status === 'SUCCEEDED') {
        console.log('[Douyin VideoURLs] Run 완료됨');
        break;
      }
      if (status === 'FAILED' || status === 'ABORTED') {
        console.error('[Douyin VideoURLs] Run 실패:', statusData.data.statusMessage);
        return new Map();
      }

      if (status === 'RUNNING' || status === 'READY') {
        await new Promise(r => setTimeout(r, waitTime));
        waitTime = Math.min(waitTime * 2, maxWaitTime);
      }
    }

    if (status !== 'SUCCEEDED') {
      console.warn(`[Douyin VideoURLs] 타임아웃 (상태: ${status})`);
      return new Map();
    }

    // 결과 조회
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );

    const dataset = await datasetRes.json();
    console.log(`[Douyin VideoURLs] 데이터: ${Array.isArray(dataset) ? dataset.length : 0}개`);

    if (!Array.isArray(dataset) || dataset.length === 0) {
      return new Map();
    }

    // id → videoUrl 매핑 생성
    const urlMap = new Map<string, string>();
    dataset.forEach((item: any) => {
      const videoUrl = item.videoMeta?.playUrl || item.video?.url || item.downloadUrl || item.playUrl;
      if (item.id && videoUrl) {
        urlMap.set(item.id, videoUrl);
      }
    });

    console.log(`[Douyin VideoURLs] ✅ 완료: ${urlMap.size}개 비디오 URL`);
    return urlMap;
  } catch (error) {
    console.error('[Douyin VideoURLs] 오류:', error);
    return new Map();
  }
}
