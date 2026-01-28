import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, videoId, platform = 'tiktok', webVideoUrl } = await req.json();

    let finalVideoUrl = videoUrl;

    // Handle Xiaohongshu on-demand video URL fetching
    if (platform === 'xiaohongshu' && !videoUrl && webVideoUrl) {
      console.log('[Download] Xiaohongshu: Fetching video URL from post URL...');

      try {
        const fetchRes = await fetch('http://localhost:3000/api/fetch-xiaohongshu-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postUrl: webVideoUrl }),
        });

        const fetchData = await fetchRes.json();

        if (!fetchData.success) {
          throw new Error(fetchData.error || 'Failed to fetch video URL');
        }

        finalVideoUrl = fetchData.videoUrl;
        console.log('[Download] Xiaohongshu video URL obtained');
      } catch (error) {
        console.error('[Download] Xiaohongshu video URL fetch failed:', error);
        const errorMsg = error instanceof Error ? error.message : '샤오홍슈 영상 URL을 가져올 수 없습니다.';
        throw new Error(errorMsg);
      }
    }

    if (!finalVideoUrl) {
      return NextResponse.json(
        { error: '비디오 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // 플랫폼별 Referer 설정
    const refererMap: Record<string, string> = {
      'tiktok': 'https://www.tiktok.com/',
      'douyin': 'https://www.douyin.com/',
      'xiaohongshu': 'https://www.xiaohongshu.com/',
    };

    // 비디오 URL에서 파일 fetch
    let videoResponse = await fetch(finalVideoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': refererMap[platform] || 'https://www.tiktok.com/',
      },
    });

    if (!videoResponse.ok) {
      console.error('[Download] 비디오 fetch 실패:', videoResponse.status);

      // ✅ NEW: CDN URL 재시도 (query parameter 제거)
      if (finalVideoUrl.includes('?')) {
        const isCDN = finalVideoUrl.includes('tiktokcdn') ||
                      finalVideoUrl.includes('douyinpic') ||
                      finalVideoUrl.includes('xhscdn');

        if (isCDN) {
          console.warn('[Download] ⚠️ Retrying without query parameters...');
          const baseUrl = finalVideoUrl.split('?')[0];

          const retryResponse = await fetch(baseUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': refererMap[platform] || 'https://www.tiktok.com/',
            },
          });

          if (retryResponse.ok) {
            console.log('[Download] ✅ Retry successful');
            videoResponse = retryResponse;
          }
        }
      }

      // If still not OK, return error
      if (!videoResponse.ok) {
        // 🆕 403 Forbidden: CDN URL 만료 - 프론트엔드에서 재크롤링 트리거
        if (videoResponse.status === 403) {
          console.warn('[Download] 403 Forbidden detected - CDN URL expired, client should trigger recrawl');
          return NextResponse.json(
            {
              error: '영상 URL이 만료되었습니다',
              needsRecrawl: true,
              message: '프론트엔드에서 재크롤링을 트리거하세요',
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          { error: '비디오를 불러올 수 없습니다.' },
          { status: videoResponse.status }
        );
      }
    }

    // Validate Content-Type
    const contentType = videoResponse.headers.get('Content-Type');
    console.log('[Download] Content-Type:', contentType);

    if (!contentType || !(contentType.includes('video') || contentType.includes('octet-stream'))) {
      console.error('[Download] Invalid Content-Type:', contentType);
      console.error('[Download] Response might be an error page, not a video');
      return NextResponse.json(
        { error: '다운로드한 파일이 비디오 형식이 아닙니다. CDN 접근 권한 문제일 수 있습니다.' },
        { status: 400 }
      );
    }

    const buffer = await videoResponse.arrayBuffer();

    // Validate file size (at least 50KB for a valid video)
    if (buffer.byteLength < 50000) {
      console.error('[Download] File too small:', buffer.byteLength, 'bytes');
      console.error('[Download] This is likely an error page, not a real video');
      return NextResponse.json(
        { error: `다운로드한 파일이 너무 작습니다 (${buffer.byteLength} bytes). 유효한 비디오가 아닙니다.` },
        { status: 400 }
      );
    }

    console.log('[Download] Video file size:', buffer.byteLength, 'bytes');

    // 파일명 생성 (플랫폼별)
    const filePrefix = platform === 'douyin' ? 'douyin' :
                       platform === 'xiaohongshu' ? 'xiaohongshu' : 'tiktok';
    const fileName = `${filePrefix}_${videoId}.mp4`;

    // 다운로드 응답 반환
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Download] 오류:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '다운로드 중 오류 발생',
      },
      { status: 500 }
    );
  }
}
