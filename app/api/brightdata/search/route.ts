import { NextRequest, NextResponse } from 'next/server';
import { getFromCache, setCache } from '@/lib/cache';

interface SearchRequest {
  query: string;
  platform: 'tiktok' | 'douyin' | 'xiaohongshu';
  limit: number;
}

interface VideoResult {
  id: string;
  title: string;
  description: string;
  creator: string;
  creatorUrl?: string;
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
    const { query, platform, limit } = body;

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

    // 캐시 확인
    const cached = getFromCache(query, platform);
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
      videoResults = await searchTikTokVideos(query, limit, apiKey);
    } else if (platform === 'douyin') {
      return NextResponse.json({
        success: false,
        query,
        platform,
        videos: [],
        error: 'Douyin은 아직 지원되지 않습니다. TikTok 검색을 이용해주세요.',
      }, { status: 400 });
    } else if (platform === 'xiaohongshu') {
      return NextResponse.json({
        success: false,
        query,
        platform,
        videos: [],
        error: 'Xiaohongshu는 아직 지원되지 않습니다. TikTok 검색을 이용해주세요.',
      }, { status: 400 });
    }

    if (videoResults && videoResults.length > 0) {
      console.log(`영상 검색 완료: ${videoResults.length}개`);

      // 캐시에 저장
      setCache(query, platform, { videos: videoResults });

      return NextResponse.json({
        success: true,
        query,
        platform,
        videos: videoResults,
        count: {
          videos: videoResults.length,
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
  apiKey: string
): Promise<VideoResult[]> {
  try {
    // 고정된 액터 ID 사용 (속도 최적화)
    const actorId = 'clockworks~tiktok-scraper';
    console.log(`[TikTok] Apify 액터 호출 시작 - 액터: ${actorId}, 검색어: ${query}, 제한: ${limit}`);

    // 1️⃣ Run 시작 (속도 최적화된 입력 파라미터)
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQueries: [query],                      // 검색 쿼리 배열
          maxItems: Math.min(limit, 30),               // 최대 결과 개수 (최대 30으로 제한)
          resultsPerPage: Math.min(limit, 30),         // 페이지당 결과 개수 (최대 30으로 제한)
          downloadVideos: true,               // 비디오 다운로드 URL 필요
          includeVideoStatistics: true,       // 영상 통계는 필요
          includeRelatedProfiles: false,      // 관련 프로필 불필요 → 속도 향상
          useHighResolutionThumbnails: false, // 고해상도 썸네일 불필요 → 속도 향상
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
    const maxAttempts = 60; // 최대 2분 (2초 간격 × 60회)

    // 처음 1초만 기다렸다가 시작 (액터가 실행되는 시간)
    await new Promise(r => setTimeout(r, 1000));

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );

      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      if (attempt % 5 === 0) {
        // 5번마다 한 번씩만 로그 출력 (불필요한 로그 감소)
        console.log(`[TikTok] 상태: ${status} (시도: ${attempt}/${maxAttempts})`);
      }

      if (status === 'SUCCEEDED') {
        break;
      } else if (status === 'FAILED' || status === 'ABORTED') {
        console.error('[TikTok] Run 실패:', statusData.data.statusMessage);
        return [];
      }

      if (status === 'RUNNING' || status === 'READY') {
        await new Promise(r => setTimeout(r, 2000)); // 2초 대기 (네트워크 부하 감소)
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

    console.log('[TikTok] 응답 타입:', typeof dataset);
    console.log('[TikTok] 응답이 배열인가?', Array.isArray(dataset));
    console.log('[TikTok] 응답 내용 (처음 1000자):', JSON.stringify(dataset).substring(0, 1000));

    if (!Array.isArray(dataset)) {
      console.warn('[TikTok] 예상치 못한 응답 형식:', typeof dataset);
      console.warn('[TikTok] 응답 전체:', JSON.stringify(dataset));
      return [];
    }

    console.log(`[TikTok] 검색 결과: ${dataset.length}개 영상`);

    if (dataset.length === 0) {
      console.warn('[TikTok] 반환된 결과가 없습니다');
      return [];
    }

    // 첫 번째 항목의 전체 구조 확인
    console.log('[TikTok] 첫 번째 항목 전체:', JSON.stringify(dataset[0], null, 2));

    // 다운로드 관련 필드 확인 (디버깅용)
    if (dataset[0]) {
      console.log('[TikTok] videoMeta:', JSON.stringify(dataset[0].videoMeta, null, 2));
      console.log('[TikTok] download 필드:', dataset[0].download);
      console.log('[TikTok] downloadUrl 필드:', dataset[0].downloadUrl);
      console.log('[TikTok] video 필드:', dataset[0].video);
      console.log('[TikTok] webVideoUrl 필드:', dataset[0].webVideoUrl);
    }

    // 결과를 VideoResult 형식으로 변환
    return dataset.slice(0, limit).map((item: any, index: number) => {
      const hashtags = item.hashtags?.map((h: any) => h.name) || [];

      // 다운로드 URL 우선순위 (모든 가능한 필드명 시도)
      const videoUrl = item.download ||
                       item.downloadUrl ||
                       item.downloadVideoUrl ||
                       item.video ||
                       item.videoUrl ||
                       item.downloadedVideoUrl ||
                       item.videoFile ||
                       item.remoteVideoUrl ||
                       item.videoUrls?.[0] ||
                       item.videoMeta?.download ||
                       item.videoMeta?.downloadUrl ||
                       item.videoMeta?.video ||
                       item.videoMeta?.subtitleLinks?.[0]?.downloadLink ||
                       item.videoMeta?.subtitleLinks?.[0]?.tiktokLink ||
                       undefined;

      console.log(`[TikTok] Video ${index + 1} - 사용된 videoUrl:`, videoUrl);

      return {
        id: item.id || `video-${index}`,
        title: item.text || `영상 ${index + 1}`,
        description: item.text || '',
        creator: item.authorMeta?.name || item.authorMeta?.nickName || 'Unknown',
        creatorUrl: item.authorMeta?.profileUrl || undefined,
        playCount: parseInt(item.playCount || 0),
        likeCount: parseInt(item.diggCount || 0),
        commentCount: parseInt(item.commentCount || 0),
        shareCount: parseInt(item.shareCount || 0),
        createTime: item.createTime ? parseInt(item.createTime) * 1000 : Date.now(),
        videoDuration: parseInt(item.videoMeta?.duration || 0),
        hashtags: hashtags,
        thumbnail: item.videoMeta?.coverUrl || item.videoMeta?.originalCoverUrl || undefined,
        videoUrl: videoUrl || item.webVideoUrl || undefined,
        webVideoUrl: item.webVideoUrl || undefined,
      };
    });
  } catch (error) {
    console.error('[TikTok] Apify API 호출 오류:', error);
    return [];
  }
}
