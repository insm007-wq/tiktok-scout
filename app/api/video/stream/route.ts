import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoUrl = searchParams.get('url');
    const platform = searchParams.get('platform') || 'douyin';

    if (!videoUrl) {
      return NextResponse.json(
        { error: '비디오 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('[Stream] 비디오 스트리밍 시작:', platform);

    // 플랫폼별 Referer 설정
    const refererMap: Record<string, string> = {
      'tiktok': 'https://www.tiktok.com/',
      'douyin': 'https://www.douyin.com/',
      'xiaohongshu': 'https://www.xiaohongshu.com/',
    };

    // 비디오 가져오기 (Referer 헤더 포함)
    const videoResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': refererMap[platform] || 'https://www.douyin.com/',
      },
    });

    if (!videoResponse.ok) {
      console.error('[Stream] 비디오 fetch 실패:', videoResponse.status);
      return NextResponse.json(
        { error: '비디오를 불러올 수 없습니다.' },
        { status: videoResponse.status }
      );
    }

    // Range 요청 처리 (비디오 seek 지원)
    const range = req.headers.get('range');
    if (range && videoResponse.status === 206) {
      const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
      const contentRange = videoResponse.headers.get('content-range') || '';
      const contentLength = videoResponse.headers.get('content-length') || '';

      return new NextResponse(videoResponse.body, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': contentRange,
          'Content-Length': contentLength,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 일반 스트리밍 응답 반환
    const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = videoResponse.headers.get('content-length');

    return new NextResponse(videoResponse.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength || '',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Stream] 오류:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '스트리밍 중 오류 발생',
      },
      { status: 500 }
    );
  }
}
