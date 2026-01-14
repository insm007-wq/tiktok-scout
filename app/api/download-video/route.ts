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
        throw new Error('샤오홍슈 영상 URL을 가져올 수 없습니다.');
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
    const videoResponse = await fetch(finalVideoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': refererMap[platform] || 'https://www.tiktok.com/',
      },
    });

    if (!videoResponse.ok) {
      console.error('[Download] 비디오 fetch 실패:', videoResponse.status);
      return NextResponse.json(
        { error: '비디오를 불러올 수 없습니다.' },
        { status: videoResponse.status }
      );
    }

    const buffer = await videoResponse.arrayBuffer();

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
