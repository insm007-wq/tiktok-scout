import { NextRequest, NextResponse } from 'next/server';
import { getFromCache, setCache } from '@/lib/cache';

interface SearchRequest {
  query: string;
  platform: 'tiktok' | 'douyin' | 'xiaohongshu';
  limit: number;
  dateRange?: string;
}

interface VideoResult {
  id: string;
  title: string;
  description: string;
  creator: string;
  creatorUrl?: string;
  followerCount?: number; // 팔로워 수 (있을 경우)
  playCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createTime: number;
  videoDuration: number;
  hashtags: string[];
  thumbnail?: string;
  videoUrl?: string;
  webVideoUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SearchRequest = await req.json();
    const { query, platform, limit, dateRange } = body;

    // 입력 유효성 검사
    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: '검색어를 입력해주세요.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Apify API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    console.log(`[${platform.toUpperCase()}] 검색 시작: ${query}`);

    // 캐시 확인 (dateRange 포함)
    const cached = getFromCache(query, platform, dateRange);
    if (cached) {
      return NextResponse.json({
        success: true,
        query,
        platform,
        videos: cached.videos.slice(0, limit),
        count: { videos: Math.min(cached.videos.length, limit) },
        fromCache: true,
      });
    }

    // 플랫폼별 검색 실행
    let videoResults: VideoResult[] = [];

    if (platform === 'tiktok') {
      videoResults = await searchTikTokVideos(query, limit, apiKey, dateRange);
    } else if (platform === 'douyin') {
      videoResults = await searchDouyinVideos(query, limit, apiKey, dateRange);
    } else if (platform === 'xiaohongshu') {
      videoResults = await searchXiaohongshuVideos(query, limit, apiKey, dateRange);
    }

    if (videoResults && videoResults.length > 0) {
      // 중복 제거 (같은 ID를 가진 영상이 여러 번 나타나는 경우 방지)
      const uniqueVideos = Array.from(
        new Map(videoResults.map((video) => [video.id, video])).values()
      );

      console.log(`영상 검색 완료: ${videoResults.length}개 → 중복 제거 후: ${uniqueVideos.length}개`);

      // 캐시에 저장 (dateRange 포함)
      setCache(query, platform, { videos: uniqueVideos }, dateRange);

      return NextResponse.json({
        success: true,
        query,
        platform,
        videos: uniqueVideos,
        count: {
          videos: uniqueVideos.length,
        },
        fromCache: false,
      });
    } else {
      console.error(`Apify에서 ${platform} 영상을 찾을 수 없습니다.`);
      return NextResponse.json({
        success: false,
        query,
        platform,
        videos: [],
        error: `API에서 영상을 찾을 수 없습니다. 검색어: "${query}"`,
      }, { status: 404 });
    }
  } catch (error) {
    console.error('검색 중 오류:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        results: []
      },
      { status: 500 }
    );
  }
}

/**
 * Apify 공식 TikTok Scraper를 사용하여 TikTok 영상 검색
 * 실행 → 폴링 → 결과 조회 방식
 */
async function searchTikTokVideos(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string
): Promise<VideoResult[]> {
  try {
    // Api Dojo TikTok Scraper - 최고 평점(4.8), 가장 정확하고 빠름
    const actorId = 'apidojo~tiktok-scraper';  // ⭐ 틸드(~) 사용, 슬래시(/) 아님
    const startTime = Date.now();
    console.log(`[TikTok] Apify 액터 호출 시작 - 액터: ${actorId}, 검색어: ${query}, 제한: ${limit}, 날짜: ${dateRange}`);

    // uploadPeriod → Api Dojo dateRange 매핑
    const mapDateRange = (uploadPeriod?: string): string => {
      const mapping: Record<string, string> = {
        'all': 'DEFAULT',
        'yesterday': 'YESTERDAY',
        '7days': 'THIS_WEEK',
        '1month': 'THIS_MONTH',
        '3months': 'LAST_THREE_MONTHS',
      };
      return mapping[uploadPeriod || 'all'] || 'DEFAULT';
    };

    // 1️⃣ Run 시작 (Api Dojo 파라미터 형식)
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: [query],              // 검색 키워드
          maxItems: 50,                   // 최대 50개 결과
          sortType: 'RELEVANCE',          // 관련성으로 정렬
          location: 'US',                 // 위치 (기본값)
          dateRange: mapDateRange(dateRange),  // 동적 날짜 범위
          includeSearchKeywords: false,   // 검색 키워드 포함 안함
          startUrls: [],                  // URL 없음 (검색 기반)
        }),
      }
    );

    const runData = await runRes.json();

    if (!runRes.ok) {
      console.error('[TikTok] Run 시작 오류:', runData);
      return [];
    }

    const runId = runData.data.id;
    console.log(`[TikTok] Run ID: ${runId}`);

    // 2️⃣ 실행 완료 대기 (Polling - 속도 최적화)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 60; // 최대 2분
    let waitTime = 500; // 0.5초부터 시작 (지수 백오프)
    const maxWaitTime = 5000; // 최대 5초

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );

      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      if (process.env.NODE_ENV === 'development' && attempt % 5 === 0) {
        // 개발 환경에서만 로깅
        console.log(`[TikTok] 상태: ${status} (시도: ${attempt}/${maxAttempts})`);
      }

      if (status === 'SUCCEEDED') {
        break;
      } else if (status === 'FAILED' || status === 'ABORTED') {
        console.error('[TikTok] Run 실패:', statusData.data.statusMessage);
        return [];
      }

      if (status === 'RUNNING' || status === 'READY') {
        await new Promise(r => setTimeout(r, waitTime));
        // 지수 백오프: 0.5s → 1s → 2s → 4s → 5s (최대)
        waitTime = Math.min(waitTime * 2, maxWaitTime);
      }
    }

    if (status !== 'SUCCEEDED') {
      console.warn(`[TikTok] Run 타임아웃 (상태: ${status})`);
      return [];
    }

    console.log('[TikTok] Run 완료, 결과 조회 시작');

    // 3️⃣ 결과 Dataset 가져오기
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );

    const dataset = await datasetRes.json();

    if (!Array.isArray(dataset)) {
      console.error('[TikTok] 예상치 못한 응답 형식:', typeof dataset);
      return [];
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[TikTok] 검색 결과: ${dataset.length}개 영상`);
    }

    if (dataset.length === 0) {
      return [];
    }

    // 첫 번째 항목 확인 (디버깅)
    if (process.env.NODE_ENV === 'development') {
      console.log('[TikTok] 첫 번째 항목 (전체):', JSON.stringify(dataset[0], null, 2).substring(0, 1000));
      console.log('[TikTok] 응답 필드 목록:', Object.keys(dataset[0]).join(', '));
      console.log('[TikTok] 총 결과 개수:', dataset.length);
    }

    // 결과를 VideoResult 형식으로 변환 (Api Dojo 형식) - 최대 50개만
    const results = dataset.slice(0, Math.min(limit, 50)).map((item: any, index: number) => {
      // 해시태그 파싱 (null 체크 추가)
      const hashtags = Array.isArray(item.hashtags)
        ? item.hashtags
            .filter((h: any) => h !== null && h !== undefined)  // null/undefined 필터링
            .map((h: any) => typeof h === 'string' ? h : (h && h.name ? h.name : h))
        : [];

      // 비디오 다운로드 URL (Api Dojo: video.url 제공)
      const videoUrl = item.video?.url || item.downloadUrl || item.videoUrl || undefined;

      // 웹 주소 (TikTok 링크)
      const webVideoUrl = item.postPage ||
                         (item.channel?.url && item.id ? `${item.channel.url}/video/${item.id}` : undefined) ||
                         undefined;

      if (process.env.NODE_ENV === 'development' && index === 0) {
        console.log('[TikTok] Api Dojo 응답 확인:', {
          id: item.id,
          title: item.title ? item.title.substring(0, 50) : 'N/A',
          hasVideoUrl: !!item.video?.url,
          hasPostPage: !!item.postPage,
          channelName: item.channel?.name,
          channelFollowers: item.channel?.followers,
          hashtags: item.hashtags ? `${item.hashtags.length}개` : 'null',
          uploadedAt: item.uploadedAt,
        });
      }

      return {
        id: item.id || `video-${index}`,
        title: item.title || `영상 ${index + 1}`,
        description: item.title || '',
        creator: item.channel?.name || item.channel?.username || 'Unknown',
        creatorUrl: item.channel?.url || undefined,
        followerCount: item.channel?.followers ? parseInt(String(item.channel.followers)) : undefined,
        playCount: parseInt(String(item.views || 0)),
        likeCount: parseInt(String(item.likes || 0)),
        commentCount: parseInt(String(item.comments || 0)),
        shareCount: parseInt(String(item.shares || 0)),
        createTime: item.uploadedAt
          ? parseInt(String(item.uploadedAt)) * 1000  // Unix timestamp → 밀리초
          : Date.now(),
        videoDuration: item.video?.duration ? parseInt(String(item.video.duration)) : 0,
        hashtags: hashtags,
        thumbnail: item.video?.thumbnail || item.video?.cover || undefined,
        videoUrl: videoUrl,  // 다운로드 가능한 URL
        webVideoUrl: webVideoUrl,  // TikTok 웹 주소
      };
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`[TikTok] ✅ 완료! 총 시간: ${duration}ms (${(duration / 1000).toFixed(2)}초)`);

    return results;
  } catch (error) {
    console.error('[TikTok] Apify API 호출 오류:', error);
    return [];
  }
}

/**
 * Apify Douyin Scraper를 사용하여 도우인 영상 검색
 * 실행 → 폴링 → 결과 조회 방식
 */
async function searchDouyinVideos(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string
): Promise<VideoResult[]> {
  try {
    // Douyin Scraper Actor (natanielsantos)
    const actorId = 'natanielsantos~douyin-scraper';
    const startTime = Date.now();
    console.log(`[Douyin] Apify 액터 호출 시작 - 액터: ${actorId}, 검색어: ${query}, 제한: ${limit}, 날짜: ${dateRange}`);

    // uploadPeriod → searchPublishTimeFilter 매핑 (Douyin 공식 파라미터)
    const mapSearchPublishTimeFilter = (uploadPeriod?: string): string => {
      const mapping: Record<string, string> = {
        'all': 'all',
        'yesterday': 'last_day',
        '7days': 'last_week',
        '1month': 'last_half_year',
        '3months': 'last_half_year',
        '6months': 'last_half_year',  // ✅ 6개월 지원
      };
      return mapping[uploadPeriod || 'all'] || 'all';
    };

    // 1️⃣ Run 시작
    const inputParams: any = {
      searchTermsOrHashtags: [query],
      searchSortFilter: 'most_liked',
      searchPublishTimeFilter: mapSearchPublishTimeFilter(dateRange),  // ✅ 날짜 필터 적용
      maxItemsPerUrl: 50,  // ✅ 50개 데이터 요청
      shouldDownloadVideos: false,  // ✅ 빠른 성능 (CDN URL, /api/download-video에서 프록시)
      shouldDownloadCovers: false,
    };

    const runStartTime = Date.now();
    console.log(`[Douyin] 전송할 파라미터:`, JSON.stringify(inputParams, null, 2));

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
      console.error('[Douyin] Run 시작 오류:', runData);
      return [];
    }

    const runId = runData.data.id;
    const runCreatedTime = Date.now();
    console.log(`[Douyin] Run ID: ${runId} (생성 시간: ${runCreatedTime - runStartTime}ms)`);

    // 2️⃣ 실행 완료 대기 (Polling - TikTok 동일한 속도로 최적화)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 60; // 최대 2분
    let waitTime = 500; // 0.5초부터 시작 (빠른 폴링)
    const maxWaitTime = 5000; // 최대 5초

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );

      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      if (process.env.NODE_ENV === 'development' && attempt % 5 === 0) {
        console.log(`[Douyin] 상태: ${status} (시도: ${attempt}/${maxAttempts})`);
      }

      if (status === 'SUCCEEDED') {
        break;
      } else if (status === 'FAILED' || status === 'ABORTED') {
        console.error('[Douyin] Run 실패:', statusData.data.statusMessage);
        return [];
      }

      if (status === 'RUNNING' || status === 'READY') {
        await new Promise(r => setTimeout(r, waitTime));
        // 지수 백오프: 0.5s → 1s → 2s → 4s → 5s (최대)
        waitTime = Math.min(waitTime * 2, maxWaitTime);
      }
    }

    if (status !== 'SUCCEEDED') {
      console.warn(`[Douyin] Run 타임아웃 (상태: ${status})`);
      return [];
    }

    const pollingCompleteTime = Date.now();
    console.log(`[Douyin] ⏳ Polling 완료! Actor 실행 시간: ${pollingCompleteTime - runCreatedTime}ms (총: ${pollingCompleteTime - runStartTime}ms, 시도: ${attempt}회)`);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Douyin] Run 완료, 결과 조회 시작');
    }

    // 3️⃣ 결과 Dataset 가져오기
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );

    const dataset = await datasetRes.json();
    const datasetFetchTime = Date.now();
    console.log(`[Douyin] 📦 Dataset 조회 완료: ${datasetFetchTime - pollingCompleteTime}ms (총: ${datasetFetchTime - runStartTime}ms)`);

    if (!Array.isArray(dataset)) {
      console.warn('[Douyin] 예상치 못한 응답 형식:', typeof dataset);
      return [];
    }

    console.log(`[Douyin] 검색 결과: ${dataset.length}개 영상`);

    if (dataset.length === 0) {
      console.warn('[Douyin] 반환된 결과가 없습니다');
      return [];
    }

    // 결과를 VideoResult 형식으로 변환
    const results = dataset.slice(0, limit).map((item: any, index: number) => {
      const hashtags = item.hashtags?.map((h: any) => typeof h === 'string' ? h : h.name) || [];

      return {
        id: item.id || `douyin-video-${index}`,
        title: item.text || item.desc || item.description || `영상 ${index + 1}`,
        description: item.text || item.desc || '',
        creator: item.authorMeta?.name || item.authorName || 'Unknown',
        creatorUrl: item.authorMeta?.avatarLarge || item.authorUrl || undefined,
        followerCount: item.authorMeta?.followersCount ? parseInt(item.authorMeta.followersCount) : undefined,
        playCount: parseInt(item.statistics?.diggCount || 0),  // Douyin: 조회수 대신 좋아요 수 사용
        likeCount: parseInt(item.statistics?.diggCount || 0),  // Douyin: diggCount = 좋아요
        commentCount: parseInt(item.statistics?.commentCount || 0),
        shareCount: parseInt(item.statistics?.shareCount || 0),
        createTime: item.createTime ? parseInt(item.createTime) * 1000 : Date.now(),
        videoDuration: parseInt(item.videoMeta?.duration || item.duration || 0),
        hashtags: hashtags,
        thumbnail: item.videoMeta?.cover || item.videoMeta?.originCover || item.thumb || undefined,
        videoUrl: item.videoMeta?.playUrl || item.video?.url || item.downloadUrl || item.playUrl || undefined,  // shouldDownloadVideos: true일 때 Key-Value Store URL
        webVideoUrl: item.url || undefined,  // Douyin 웹 링크
      };
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    const dataConversionTime = endTime - datasetFetchTime;
    console.log(`[Douyin] 🔄 데이터 변환: ${dataConversionTime}ms`);
    console.log(`\n[Douyin] ✅ 총 완료!\n  - 요청→Run 생성: ${runCreatedTime - runStartTime}ms\n  - Run 실행 (Polling): ${pollingCompleteTime - runCreatedTime}ms\n  - Dataset 조회: ${datasetFetchTime - pollingCompleteTime}ms\n  - 데이터 변환: ${dataConversionTime}ms\n  - 🎯 총 시간: ${duration}ms (${(duration / 1000).toFixed(2)}초)\n`);

    return results;
  } catch (error) {
    console.error('[Douyin] Apify API 호출 오류:', error);
    return [];
  }
}

/**
 * Apify Xiaohongshu(小红书/RED) Search Scraper를 사용하여 검색
 * 실행 → 폴링 → 결과 조회 방식
 */
async function searchXiaohongshuVideos(
  query: string,
  limit: number,
  apiKey: string,
  dateRange?: string
): Promise<VideoResult[]> {
  try {
    // RedNote(Xiaohongshu) Search Scraper - 4.4/5 평점
    const actorId = 'easyapi~rednote-xiaohongshu-search-scraper';
    const startTime = Date.now();
    console.log(`[Xiaohongshu] Apify 액터 호출 시작 - 액터: ${actorId}, 검색어: ${query}, 제한: ${limit}, 날짜: ${dateRange}`);

    // 1️⃣ Run 시작
    // Search Scraper 파라미터
    const inputParams = {
      keywords: [query],
      maxItems: Math.min(limit, 100),
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
      console.error('[Xiaohongshu] Run 시작 오류:', runData);
      console.error('[Xiaohongshu] 응답 코드:', runRes.status);
      console.error('[Xiaohongshu] 응답 메시지:', JSON.stringify(runData, null, 2));
      return [];
    }

    const runId = runData.data.id;
    console.log(`[Xiaohongshu] Run ID: ${runId}`);

    // 2️⃣ 실행 완료 대기 (Polling - 지수 백오프)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 60;
    let waitTime = 500; // 초기 대기 0.5초
    const maxWaitTime = 5000; // 최대 5초

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );

      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      if (status === 'SUCCEEDED') {
        break;
      } else if (status === 'FAILED' || status === 'ABORTED') {
        console.error('[Xiaohongshu] Run 실패:', statusData.data.statusMessage);
        return [];
      }

      if (status === 'RUNNING' || status === 'READY') {
        await new Promise(r => setTimeout(r, waitTime));
        waitTime = Math.min(waitTime * 1.5, maxWaitTime);
      }
    }

    if (status !== 'SUCCEEDED') {
      console.error(`[Xiaohongshu] Run 타임아웃 (상태: ${status})`);
      return [];
    }

    const pollingCompleteTime = Date.now();

    // 3️⃣ 결과 Dataset 가져오기
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );

    if (!datasetRes.ok) {
      console.error('[Xiaohongshu] Dataset 조회 오류:', datasetRes.status, datasetRes.statusText);
      return [];
    }

    const dataset = await datasetRes.json();
    const datasetFetchTime = Date.now();
    console.log(`[Xiaohongshu] 📦 Dataset 조회 완료: ${datasetFetchTime - pollingCompleteTime}ms`);

    if (!Array.isArray(dataset)) {
      console.error('[Xiaohongshu] 예상치 못한 응답 형식 - 배열이 아님');
      return [];
    }

    if (dataset.length === 0) {
      console.log('[Xiaohongshu] 검색 결과가 없습니다');
      return [];
    }

    console.log(`[Xiaohongshu] 검색 결과: ${dataset.length}개 포스트`);

    // 결과를 VideoResult 형식으로 변환
    const results = dataset.slice(0, limit).map((item: any, index: number) => {
      // 이미지 포스트 vs 영상 포스트 구분
      const isVideo =
        item.item?.note_card?.type === "video" ||
        item.item?.type === "video" ||
        !!item.item?.video?.media;

      // 여러 가능한 필드명 시도
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

      // 썸네일: 영상과 이미지 포스트 구분
      const thumbnail = isVideo
        ? (item.item?.video?.media?.cover ||
           item.item?.note_card?.cover?.url_default)
        : (item.item?.note_card?.cover?.url_default ||
           item.item?.note_card?.image_list?.[0]?.info_list?.[0]?.url);

      // Search Scraper는 영상 다운로드 URL을 제공하지 않음
      // videoUrl은 undefined (필요시 나중에 별도 액터 연동)
      const videoUrl = undefined;

      // 포스트 URL (사용자가 외부 다운로더에서 사용 가능)
      // Search Scraper 응답 구조: item.link 또는 postUrl 필드
      const webVideoUrl = item.link || item.postUrl || item.url || undefined;

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
        videoUrl: videoUrl,
        webVideoUrl: webVideoUrl,
      };
    });

    const totalTime = Date.now() - startTime;
    console.log(`[Xiaohongshu] ✅ Search Scraper 완료!\n  - 액터 실행 + Polling: ${datasetFetchTime - startTime}ms\n  - Dataset 조회: ${Date.now() - datasetFetchTime}ms\n  - 🎯 총 시간: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}초)\n`);

    return results;
  } catch (error) {
    console.error('[Xiaohongshu] Apify API 호출 오류:', error);
    return [];
  }
}
