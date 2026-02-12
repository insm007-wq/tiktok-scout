import { VideoResult } from '@/types/video';
import { parseXiaohongshuTime } from '@/lib/utils/xiaohongshuTimeParser';
import { fetchPostWithRetry, fetchGetWithRetry } from '@/lib/utils/fetch-with-retry';

/**
 * Xiaohongshu(小红书) 영상 검색 (easyapi Search Scraper)
 * ⚠️ 현재 액터가 Selector Timeout 이슈 발생 중
 * 액터 복구 후 자동으로 작동
 *
 * ✅ 429 Rate Limit 자동 재시도 (Exponential Backoff)
 */
export async function searchXiaohongshuVideos(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string
): Promise<VideoResult[]> {
  try {
    const actorId = 'easyapi~rednote-xiaohongshu-search-scraper';
    const startTime = Date.now();

    // Note: Search Scraper는 날짜 필터 미지원
    const inputParams = {
      keywords: [query],
      maxItems: Math.min(limit, 100),
      disableDataset: true,  // ✅ R2 저장 비활성화 (결과만 메모리에 반환)
    };

    // 1️⃣ Run 시작 (429 에러 시 자동 재시도)
    const runRes = await fetchPostWithRetry(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
      inputParams,
      {},
      { maxRetries: 3, initialDelayMs: 1000 }
    );

    const runData = await runRes.json();
    if (!runRes.ok) {
      return [];
    }

    const runId = runData.data.id;

    // 2️⃣ 완료 대기 (Polling with exponential backoff)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 120;  // ✅ IMPROVED: 다른 플랫폼과 일관성 (60→120)
    let waitTime = 500;
    const maxWaitTime = 5000;

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, waitTime));  // ✅ 루프 시작 시 대기

      const statusRes = await fetchGetWithRetry(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );

      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

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

    // 3️⃣ 결과 조회
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );

    if (!datasetRes.ok) {
      return [];
    }

    const dataset = await datasetRes.json();
    if (!Array.isArray(dataset) || dataset.length === 0) {
      return [];
    }

    // 액터에 비디오 요청했으므로 별도 필터 없이 전부 사용
    const results = await Promise.all(
      dataset.slice(0, limit).map(async (item: any, index: number) => {
        const title =
          item.item?.note_card?.display_title ||
          item.item?.title ||
          item.title ||
          item.desc ||
          item.description ||
          `포스트 ${index + 1}`;

        const creator =
          item.item?.note_card?.user?.nickname ||
          item.item?.note_card?.user?.nick_name ||
          item.author ||
          item.creator ||
          'Unknown';

        const likeCount = parseInt(
          item.item?.note_card?.interact_info?.liked_count ||
          item.likes ||
          item.like_count ||
          0
        );

        const playCount = parseInt(
          item.item?.note_card?.interact_info?.play_count ||
          item.views ||
          item.view_count ||
          likeCount ||
          0
        );

        const commentCount = parseInt(
          item.item?.note_card?.interact_info?.comment_count ||
          item.comments ||
          item.comment_count ||
          0
        );

        const shareCount = parseInt(
          item.item?.note_card?.interact_info?.shared_count ||
          item.shares ||
          item.share_count ||
          0
        );

        const thumbnail =
          item.item?.video?.media?.cover ||
          item.item?.note_card?.cover?.url_default;

        // ✅ NEW: CDN URL 수신 로깅
        console.log(`[Worker:Xiaohongshu] 🖼️ CDN URL received`, {
          videoId: item.item?.id || item.id || `xiaohongshu-${index}`,
          hasThumbnail: !!thumbnail,
          thumbnailPreview: thumbnail ? thumbnail.substring(0, 60) : 'N/A',
          hasVideo: false,
        });

        // ✅ CDN URL 직접 사용 (R2 업로드 제거)
        return {
          id: item.item?.id || item.id || `xiaohongshu-${index}`,
          title: title,
          description: title,
          creator: creator,
          creatorUrl: item.item?.note_card?.user?.avatar || undefined,
          followerCount: undefined,
          playCount: playCount,
          likeCount: likeCount,
          commentCount: commentCount,
          shareCount: shareCount,
          createTime: parseXiaohongshuTime(item.item?.note_card?.corner_tag_info),
          videoDuration:
            item.item?.video?.media?.duration ||
            item.item?.note_card?.video?.media?.duration ||
            0,
          hashtags: [],
          thumbnail: thumbnail,
          videoUrl: undefined,
          webVideoUrl: item.link || item.postUrl || item.url || undefined,
        };
      })
    );

    const duration = Date.now() - startTime;

    return results;
  } catch (error) {
    return [];
  }
}

/**
 * Kuaima Xiaohongshu Search 액터 (자동 페이지네이션, 결과 많음)
 * https://apify.com/kuaima/xiaohongshu-search
 */
async function searchXiaohongshuVideosKuaima(
  query: string,
  limit: number,
  apiKey: string
): Promise<VideoResult[]> {
  const actorId = 'kuaima~xiaohongshu-search';
  const maxItems = Math.min(limit, 100);
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categories: '全部',
        search_key: query,
        scrape_detail: true,
        download_image: false,
        cookie_val: '',
        filter: '最新',  // 最新=최신순, 最热=인기순
        maxItems,
      }),
    }
  );
  if (!runRes.ok) {
    console.warn('[Worker:Xiaohongshu] Kuaima actor start failed:', runRes.status);
    return [];
  }
  const runData = await runRes.json();
  const runId = runData.data?.id;
  if (!runId) return [];

  let status = 'RUNNING';
  let attempt = 0;
  while ((status === 'RUNNING' || status === 'READY') && attempt < 120) {
    await new Promise((r) => setTimeout(r, 500));
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    const statusData = await statusRes.json();
    status = statusData.data?.status || 'UNKNOWN';
    attempt++;
    if (status === 'SUCCEEDED') break;
    if (status === 'FAILED' || status === 'ABORTED') return [];
  }
  if (status !== 'SUCCEEDED') return [];

  const datasetRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
  );
  if (!datasetRes.ok) return [];
  const dataset = await datasetRes.json();
  if (!Array.isArray(dataset) || dataset.length === 0) return [];

  // 영상만 사용: noteType 또는 type이 video/视频인 것만 (이미지 포스트 제외)
  const videoOnly = dataset.filter((item: any) => {
    const nt = String(item.noteType ?? item.type ?? '').toLowerCase();
    return nt === 'video' || item.noteType === '视频' || item.type === '视频';
  });
  const dropped = dataset.length - videoOnly.length;
  if (dropped > 0) {
    console.log(`[Worker:Xiaohongshu] 📥 Kuaima query="${query}" → ${dataset.length} items, 영상만 ${videoOnly.length}개 (이미지 ${dropped}개 제외)`);
  } else {
    console.log(`[Worker:Xiaohongshu] 📥 Kuaima query="${query}" → ${videoOnly.length} items`);
  }

  const results: VideoResult[] = videoOnly.slice(0, limit).map((item: any, index: number) => {
    const id = (item.href && item.href.match(/\/explore\/(\w+)/)?.[1]) || `kuaima-${index}`;
    const likeCount = parseInt(String(item.like_count || item.liked_count || 0), 10);
    const dateStr = item.date || '';
    const createTime = dateStr ? new Date(dateStr).getTime() : 0;
    return {
      id,
      title: item.title || item.desec || `포스트 ${index + 1}`,
      description: item.title || item.desec || '',
      creator: item.author || 'Unknown',
      creatorUrl: item.author_avatar,
      followerCount: undefined,
      playCount: 0,
      likeCount,
      commentCount: parseInt(String(item.chat_count || 0), 10),
      shareCount: 0,
      createTime,
      videoDuration: 0,
      hashtags: Array.isArray(item.tags) ? item.tags : [],
      thumbnail: item.cover_url || item.thumbnail || undefined,
      videoUrl: undefined,
      webVideoUrl: item.href || item.link || item.url || item.postUrl || undefined,
    };
  });
  return results;
}

/**
 * Xiaohongshu 검색 — test6 전용: kuaima만 사용 (env 없음, easyapi 미사용)
 */
export async function searchXiaohongshuVideosParallel(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string
): Promise<VideoResult[]> {
  return searchXiaohongshuVideosKuaima(query, limit, apiKey);
}

async function searchXiaohongshuVideosEasyapi(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string
): Promise<VideoResult[]> {
  try {
    const actorId = 'easyapi~rednote-xiaohongshu-search-scraper';
    const startTime = Date.now();
    const maxItems = Math.min(limit, 50);

    // Apify 폼 파라미터에 맞춤: Search Keywords, Sort type, Note type, Maximum Items
    const inputParams = {
      keywords: [query],
      sortType: 'general',
      noteType: 'video',
      maxItems,
    };

    // 1️⃣ Run 시작 (재시도 없이 1회만 — 재시도 시마다 새 Run이 생성되어 3개 뜨는 문제 방지)
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
      return [];
    }

    const runId = runData.data.id;

    // 2️⃣ 완료 대기 (폴링)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 120;
    let waitTime = 500;
    const maxWaitTime = 5000;

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, waitTime));

      const statusRes = await fetchGetWithRetry(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );
      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        return [];
      }

      waitTime = Math.min(waitTime * 1.5, maxWaitTime);
    }

    if (status !== 'SUCCEEDED') {
      return [];
    }

    // 3️⃣ Dataset 조회
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );

    if (!datasetRes.ok) {
      return [];
    }

    const dataset = await datasetRes.json();
    if (!Array.isArray(dataset) || dataset.length === 0) {
      return [];
    }

    // 액터에 noteType: 'video'로 요청했으므로 반환된 항목은 모두 영상. 클라이언트 필터 제거(과도한 필터로 누락 방지)
    console.log(`[Worker:Xiaohongshu] 📥 query="${query}" → Actor returned ${dataset.length} items (noteType=video, maxItems=50). 결과가 적으면 검색어를 더 넓게(예: 중국어 车载用品·车品) 시도해 보세요.`);

    if (dataset.length === 0) {
      return [];
    }

    // 4️⃣ 결과 변환 (item.item / item 둘 다 지원)
    const it = (x: any) => x?.item ?? x;
    const results = await Promise.all(
      dataset.slice(0, limit).map(async (item: any, index: number) => {
        const i = it(item);
        const nc = i?.note_card ?? item.note_card;
        const title =
          nc?.display_title ||
          i?.title ||
          item.title ||
          item.desc ||
          item.description ||
          `포스트 ${index + 1}`;

        const creator =
          nc?.user?.nickname ||
          nc?.user?.nick_name ||
          item.author ||
          item.creator ||
          'Unknown';

        const interact = nc?.interact_info;
        const likeCount = parseInt(interact?.liked_count || item.likes || item.like_count || 0);
        const playCount = parseInt(interact?.play_count || item.views || item.view_count || likeCount || 0);
        const commentCount = parseInt(interact?.comment_count || item.comments || item.comment_count || 0);
        const shareCount = parseInt(interact?.shared_count || item.shares || item.share_count || 0);

        const thumbnail =
          i?.video?.media?.cover ||
          nc?.video?.media?.cover ||
          nc?.cover?.url_default;

        const videoId = i?.id || item.id || `xiaohongshu-${index}`;
        const webVideoUrl = item.link || item.postUrl || item.url || undefined;

        return {
          id: videoId,
          title,
          description: title,
          creator,
          creatorUrl: nc?.user?.avatar || undefined,
          followerCount: undefined,
          playCount,
          likeCount,
          commentCount,
          shareCount,
          createTime: parseXiaohongshuTime(nc?.corner_tag_info),
          videoDuration:
            i?.video?.media?.duration ||
            nc?.video?.media?.duration ||
            0,
          hashtags: [],
          thumbnail,
          videoUrl: undefined,
          webVideoUrl,
        };
      })
    );

    // 6️⃣ 중복 제거 (ID 기준)
    const uniqueResults = Array.from(
      new Map(results.map((video) => [video.id, video])).values()
    );

    const duration = Date.now() - startTime;

    return uniqueResults;
  } catch (error) {
    return [];
  }
}
