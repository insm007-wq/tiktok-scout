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
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      },
      redirect: 'follow'
    });

    if (!videoResponse.ok) {
      console.error('[Download] Download failed:', videoResponse.status, videoResponse.statusText);
      return NextResponse.json(
        { error: 'Cannot download video' },
        { status: videoResponse.status }
      );
    }

    const arrayBuffer = await videoResponse.arrayBuffer();

    console.log('[Download] Downloaded bytes:', arrayBuffer.byteLength);

    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Length', arrayBuffer.byteLength.toString());
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

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
