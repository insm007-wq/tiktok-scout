import { VideoResult } from '@/types/video';
import { parseXiaohongshuTime } from '@/lib/utils/xiaohongshuTimeParser';
import { fetchPostWithRetry, fetchGetWithRetry } from '@/lib/utils/fetch-with-retry';

/**
 * Xiaohongshu 검색 — easyapi/rednote-xiaohongshu-search-scraper 사용
 */
export async function searchXiaohongshuVideosParallel(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string
): Promise<VideoResult[]> {
  try {
    const actorId = 'easyapi~rednote-xiaohongshu-search-scraper';
    const startTime = Date.now();
    const maxItems = Math.min(limit, 50);

    // 검색어 뒤에 " 视频"(비디오)를 붙여서 영상 결과 확보
    const searchKeyword = query.trim().endsWith('视频') ? query.trim() : `${query.trim()} 视频`;

    // Apify 폼 파라미터에 맞춤: Search Keywords, Sort type, Note type, Maximum Items
    const inputParams = {
      keywords: [searchKeyword],
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
