/**
 * POST /api/recrawl
 *
 * 링크 갱신 트리거 엔드포인트
 * 프론트엔드에서 403 에러 감지 후 명시적으로 호출하여 최신 링크로 갱신
 *
 * Request:
 * {
 *   query: string       // 검색어
 *   platform: string    // tiktok, douyin, xiaohongshu
 *   dateRange?: string  // 업로드 시간 범위 (optional)
 * }
 *
 * Response (202 Accepted):
 * {
 *   status: 'queued' | 'in_progress'
 *   jobId: string
 *   message: string
 *   estimatedWaitSeconds: number
 * }
 *
 * Error Response:
 * - 400: Missing query or platform
 * - 401: Not authenticated
 * - 429: Rate limit exceeded
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { triggerRecrawl } from '@/lib/recrawl-service';
import { Platform } from '@/types/video';

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // Request body 파싱
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: '유효하지 않은 JSON' },
        { status: 400 }
      );
    }

    const { query, platform, dateRange } = body;

    // 필수 필드 검증
    if (!query || !platform) {
      return NextResponse.json(
        { error: 'query와 platform은 필수입니다' },
        { status: 400 }
      );
    }

    // Platform 타입 검증
    const validPlatforms: Platform[] = ['tiktok', 'douyin', 'xiaohongshu'];
    if (!validPlatforms.includes(platform as Platform)) {
      return NextResponse.json(
        {
          error: `유효하지 않은 플랫폼: ${platform}. tiktok, douyin, xiaohongshu 중 하나여야 합니다.`,
        },
        { status: 400 }
      );
    }

    console.log(
      `[Recrawl API] Trigger request from ${session.user.email}: ${platform}/${query}/${dateRange || 'all'}`
    );

    // 링크 갱신 트리거
    const result = await triggerRecrawl(query, platform as Platform, dateRange);

    // 202 Accepted 반환 (비동기 처리 중)
    if (result.alreadyInProgress) {
      return NextResponse.json(
        {
          status: 'in_progress',
          jobId: result.jobId,
          message: '이미 같은 검색어로 링크 갱신이 진행 중입니다',
          estimatedWaitSeconds: result.estimatedWaitSeconds || 30,
        },
        { status: 202 }
      );
    }

    return NextResponse.json(
      {
        status: 'queued',
        jobId: result.jobId,
        message: '링크 갱신을 시작했습니다',
        estimatedWaitSeconds: result.estimatedWaitSeconds || 30,
      },
      { status: 202 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '알 수 없는 오류';

    // Rate limit 에러
    if (errorMessage.includes('한도 초과')) {
      console.warn(`[Recrawl API] Rate limit error: ${errorMessage}`);
      return NextResponse.json(
        { error: errorMessage },
        { status: 429 }
      );
    }

    // 자동 링크 갱신 비활성화
    if (errorMessage.includes('비활성화')) {
      console.warn(`[Recrawl API] Feature disabled: ${errorMessage}`);
      return NextResponse.json(
        { error: errorMessage },
        { status: 503 }
      );
    }

    // 기타 오류
    console.error('[Recrawl API] Unexpected error:', error);
    return NextResponse.json(
      { error: '링크 갱신 요청 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
