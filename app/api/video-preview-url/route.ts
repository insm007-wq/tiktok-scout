import { NextRequest, NextResponse } from 'next/server';
import { fetchSingleVideoUrl } from '@/lib/utils/fetch-single-video-url';
import { auth } from '@/lib/auth';

/**
 * 미리보기용 비디오 URL만 조회 (다운로드 X, 할당량 차감 X)
 * - Xiaohongshu: Video Downloader 액터로 CDN URL 반환 → 앱 내 재생 가능
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { webVideoUrl, platform } = await req.json();
    if (!webVideoUrl || !platform) {
      return NextResponse.json(
        { error: 'webVideoUrl, platform 필요' },
        { status: 400 }
      );
    }

    if (platform !== 'xiaohongshu') {
      return NextResponse.json(
        { error: '현재 샤오홍슈만 미리보기 URL 조회를 지원합니다.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'APIFY_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const result = await fetchSingleVideoUrl(
      webVideoUrl,
      platform as 'tiktok' | 'douyin' | 'xiaohongshu',
      apiKey
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    if (!result.videoUrl) {
      return NextResponse.json(
        { error: '영상 URL을 가져올 수 없습니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ videoUrl: result.videoUrl });
  } catch (error) {
    console.error('[video-preview-url]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '미리보기 URL 조회 실패' },
      { status: 500 }
    );
  }
}
