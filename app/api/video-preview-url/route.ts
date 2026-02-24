import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * 미리보기용 비디오 URL만 조회 (다운로드 X, 할당량 차감 X)
 * 현재 미지원 — 필요 시 TikTok/Douyin용으로 확장 가능
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

    return NextResponse.json(
      { error: '현재 미리보기 URL 조회를 지원하지 않습니다.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[video-preview-url]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '미리보기 URL 조회 실패' },
      { status: 500 }
    );
  }
}
