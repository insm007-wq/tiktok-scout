import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoUrl = searchParams.get('url');
    const fileName = searchParams.get('name') || 'video.mp4';

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Video URL is missing' },
        { status: 400 }
      );
    }

    console.log('[Download] Starting download:', videoUrl);

    const videoResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Origin': 'https://www.tiktok.com',
        'Accept': 'video/*;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'identity',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Range': 'bytes=0-'
      },
      redirect: 'follow'
    });

    if (!videoResponse.ok) {
      console.error('[Download] Download failed:', videoResponse.status, videoResponse.statusText);
      return NextResponse.json(
        { error: `Cannot download video: ${videoResponse.statusText}. Video URL may have expired.` },
        { status: videoResponse.status }
      );
    }

    const arrayBuffer = await videoResponse.arrayBuffer();

    console.log('[Download] Downloaded bytes:', arrayBuffer.byteLength);

    // 파일 크기 검증 (최소 100KB)
    if (arrayBuffer.byteLength < 100000) {
      console.error('[Download] File size too small:', arrayBuffer.byteLength);
      return NextResponse.json(
        { error: 'Downloaded file is corrupted or too small' },
        { status: 422 }
      );
    }

    // 실제 Content-Type 감지
    const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = videoResponse.headers.get('content-length');

    console.log('[Download] Content-Type:', contentType, 'Length:', contentLength);

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', arrayBuffer.byteLength.toString());
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Accept-Ranges', 'bytes');

    console.log('[Download] Completed:', fileName);

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('[Download] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Download failed'
      },
      { status: 500 }
    );
  }
}
