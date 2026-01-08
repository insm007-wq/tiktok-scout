import { VideoResult } from '@/types/video';

/**
 * Xiaohongshu(小红书) 영상 검색 (easyapi Search Scraper)
 * ⚠️ 현재 액터가 Selector Timeout 이슈 발생 중
 * 액터 복구 후 자동으로 작동
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
    console.log(`[Xiaohongshu] 검색 시작: ${query} (제한: ${limit})`);

    // Note: Search Scraper는 날짜 필터 미지원
    const inputParams = {
      keywords: [query],
      maxItems: Math.min(limit, 100),
    };

    // 1️⃣ Run 시작
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
      console.error('[Xiaohongshu] Run 시작 실패:', runData);
      return [];
    }

    const runId = runData.data.id;
    console.log(`[Xiaohongshu] Run ID: ${runId}`);

    // 2️⃣ 완료 대기 (Polling)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 60;
    let waitTime = 500;
    const maxWaitTime = 5000;

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );

      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED') {
        console.error('[Xiaohongshu] Run 실패:', statusData.data.statusMessage);
        return [];
      }

      if (status === 'RUNNING' || status === 'READY') {
        await new Promise(r => setTimeout(r, waitTime));
        waitTime = Math.min(waitTime * 1.5, maxWaitTime);
      }
    }

    if (status !== 'SUCCEEDED') {
      console.error(`[Xiaohongshu] 타임아웃 (상태: ${status})`);
      return [];
    }

    // 3️⃣ 결과 조회
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );

    if (!datasetRes.ok) {
      console.error('[Xiaohongshu] Dataset 조회 실패:', datasetRes.status);
      return [];
    }

    const dataset = await datasetRes.json();
    if (!Array.isArray(dataset) || dataset.length === 0) {
      console.log('[Xiaohongshu] 검색 결과 없음');
      return [];
    }

    // 결과 변환
    const results = dataset.slice(0, limit).map((item: any, index: number) => {
      const isVideo =
        item.item?.note_card?.type === "video" ||
        item.item?.type === "video" ||
        !!item.item?.video?.media;

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

      const thumbnail = isVideo
        ? (item.item?.video?.media?.cover ||
           item.item?.note_card?.cover?.url_default)
        : (item.item?.note_card?.cover?.url_default ||
           item.item?.note_card?.image_list?.[0]?.info_list?.[0]?.url);

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
        createTime: Date.now(),
        videoDuration: isVideo
          ? (item.item?.video?.media?.duration || item.item?.note_card?.video?.media?.duration || 0)
          : 0,
        hashtags: [],
        thumbnail: thumbnail,
        videoUrl: undefined,
        webVideoUrl: item.link || item.postUrl || item.url || undefined,
      };
    });

    const duration = Date.now() - startTime;
    console.log(`[Xiaohongshu] ✅ 완료: ${results.length}개 (${(duration / 1000).toFixed(2)}초)`);

    return results;
  } catch (error) {
    console.error('[Xiaohongshu] 오류:', error);
    return [];
  }
}
