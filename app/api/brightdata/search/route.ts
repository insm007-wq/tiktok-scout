import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getVideoFromCache, setVideoToCache } from '@/lib/cache';
import { searchTikTokVideos } from '@/lib/scrapers/tiktok';
import { searchDouyinVideos, searchDouyinVideosParallel } from '@/lib/scrapers/douyin';
import { searchXiaohongshuVideos, searchXiaohongshuVideosParallel } from '@/lib/scrapers/xiaohongshu';
import { VideoResult, Platform } from '@/types/video';

interface SearchRequest {
  query: string;
  platform: Platform;
  limit: number;
  dateRange?: string;
}

/**
 * Railway 서버를 통해 크롤링 실행
 * @returns VideoResult[] (성공 시) 또는 [] (실패 시)
 */
async function scrapeViaRailway(
  query: string,
  platform: Platform,
  limit: number,
  dateRange?: string
): Promise<VideoResult[]> {
  const railwayUrl = process.env.RAILWAY_SERVER_URL;
  const apiSecret = process.env.RAILWAY_API_SECRET;

  // 환경 변수 미설정 시 스킵
  if (!railwayUrl || !apiSecret) {
    console.log('[Railway] 환경 변수 미설정, 로컬 스크래퍼 사용');
    return [];
  }

  try {
    console.log(`[Railway] 요청 시작: ${platform} - "${query}"`);
    const startTime = Date.now();

    const response = await fetch(`${railwayUrl}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiSecret,
      },
      body: JSON.stringify({ query, platform, limit, dateRange }),
      signal: AbortSignal.timeout(120000), // 2분 타임아웃
    });

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(`[Railway] 요청 실패 (${response.status}):`, data.error);
      return [];
    }

    if (data.success && Array.isArray(data.videos) && data.videos.length > 0) {
      console.log(`[Railway] ✅ 성공: ${data.videos.length}개 (${(duration / 1000).toFixed(2)}초)`);
      return data.videos;
    } else {
      console.warn(`[Railway] ⚠️ 비어있는 결과 (${(duration / 1000).toFixed(2)}초)`);
      return [];
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('[Railway] ❌ 에러:', error.message);
    } else {
      console.error('[Railway] ❌ 알 수 없는 에러');
    }
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 승인 상태 확인
    if (!session.user.isApproved) {
      return NextResponse.json(
        { error: '관리자 승인이 필요합니다.' },
        { status: 403 }
      );
    }

    // SMS 인증 확인
    if (!session.user.isVerified) {
      return NextResponse.json(
        { error: 'SMS 인증이 필요합니다.' },
        { status: 403 }
      );
    }

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

    // 캐시 확인 (L1 메모리 + L2 MongoDB)
    const cached = await getVideoFromCache(query, platform, dateRange);
    if (cached) {
      console.log(`[Cache] ✅ 캐시 히트: ${platform} - "${query}"`);
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

    // 1️⃣ Railway 서버로 크롤링 시도
    videoResults = await scrapeViaRailway(query, platform, limit, dateRange);

    // 2️⃣ Fallback: 로컬 스크래퍼 실행
    if (videoResults.length === 0) {
      console.log(`[Fallback] 로컬 스크래퍼 사용: ${platform}`);

      if (platform === 'tiktok') {
        videoResults = await searchTikTokVideos(query, limit, apiKey, dateRange);
      } else if (platform === 'douyin') {
        // 3개 정렬 병렬 실행 (인기순 + 최신순 + 관련성순)
        videoResults = await searchDouyinVideosParallel(query, limit, apiKey, dateRange);
      } else if (platform === 'xiaohongshu') {
        // 3개 정렬 병렬 실행 (일반 + 최신순 + 인기순)
        videoResults = await searchXiaohongshuVideosParallel(query, limit, apiKey, dateRange);
      }
    }

    if (videoResults && videoResults.length > 0) {
      // 중복 제거
      const uniqueVideos = Array.from(
        new Map(videoResults.map((video) => [video.id, video])).values()
      );

      // 캐시 저장 (L1 메모리 + L2 MongoDB)
      await setVideoToCache(query, platform, uniqueVideos, dateRange);

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
      console.error(`[${platform.toUpperCase()}] 검색 결과 없음`);
      return NextResponse.json({
        success: false,
        query,
        platform,
        videos: [],
        error: `API에서 ${platform} 영상을 찾을 수 없습니다. 검색어: "${query}"`,
      });
    }
  } catch (error) {
    console.error('[Search] 오류:', error);
    return NextResponse.json(
      { error: '검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
