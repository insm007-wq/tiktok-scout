import { NextRequest, NextResponse } from 'next/server';
import { getFromCache, setCache } from '@/lib/cache';
import { searchTikTokVideos } from '@/lib/scrapers/tiktok';
import { searchDouyinVideos } from '@/lib/scrapers/douyin';
import { searchXiaohongshuVideos } from '@/lib/scrapers/xiaohongshu';
import { VideoResult, Platform } from '@/types/video';

interface SearchRequest {
  query: string;
  platform: Platform;
  limit: number;
  dateRange?: string;
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

    // 캐시 확인
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
      // 중복 제거
      const uniqueVideos = Array.from(
        new Map(videoResults.map((video) => [video.id, video])).values()
      );

      console.log(`[${platform.toUpperCase()}] 완료: ${videoResults.length}개 → 중복 제거 후: ${uniqueVideos.length}개`);

      // 캐시 저장
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
