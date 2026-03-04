import { NextRequest, NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/utils/fetch-with-retry';
import { fetchSingleVideoUrl } from '@/lib/utils/fetch-single-video-url';
import { auth } from '@/lib/auth';
import { checkApiUsage, incrementApiUsage } from '@/lib/apiUsage';

// SRT를 순수 텍스트로 변환 (시간, 씬 번호 제거)
function parseSrtToText(srtContent: string): string {
  return srtContent
    .split('\n')
    .filter(line => {
      // 빈 줄 제거
      if (!line.trim()) return false;
      // 숫자만 있는 줄 제거 (씬 번호)
      if (/^\d+$/.test(line.trim())) return false;
      // 타이밍 줄 제거 (XX:XX:XX,XXX --> XX:XX:XX,XXX)
      if (line.includes('-->')) return false;
      return true;
    })
    .join('\n')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    // 1. 세션 확인
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 2. 할당량 체크 (관리자는 제외)
    if (!session.user.isAdmin) {
      const usageCheck = await checkApiUsage(session.user.email);
      if (!usageCheck.allowed) {
        return NextResponse.json({
          error: '일일 자막 추출 한도를 초과했습니다.',
          details: {
            used: usageCheck.used,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            resetTime: usageCheck.resetTime
          }
        }, { status: 429 });
      }

      // 3. 사용량 증가 (자막 추출 요청 시 차감)
      await incrementApiUsage(session.user.email, undefined, 'subtitles');
    }

    const { videoUrl, videoId, platform = 'tiktok', webVideoUrl, format = 'text' } = await req.json();

    if (platform !== 'tiktok' && platform !== 'douyin') {
      return NextResponse.json(
        { error: `${platform}은(는) 자막 추출을 지원하지 않습니다.` },
        { status: 400 }
      );
    }

    let finalVideoUrl = videoUrl;

    // webVideoUrl만 있을 경우 Apify로 CDN URL 조회 (download-video와 동일 방식)
    if (!finalVideoUrl && webVideoUrl) {
      console.log('[ExtractSubtitles] 🚀 webVideoUrl에서 CDN URL 조회:', webVideoUrl);
      const apiKey = process.env.APIFY_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: '서버 설정 오류: APIFY_API_KEY가 없습니다.' }, { status: 500 });
      }
      const result = await fetchSingleVideoUrl(webVideoUrl, platform as 'tiktok' | 'douyin', apiKey);
      if (result.error || !result.videoUrl) {
        return NextResponse.json({ error: result.error || '영상 URL을 가져올 수 없습니다.' }, { status: 400 });
      }
      finalVideoUrl = result.videoUrl;
      console.log('[ExtractSubtitles] ✅ CDN URL 조회 성공:', finalVideoUrl.substring(0, 100));
    }

    if (!finalVideoUrl) {
      return NextResponse.json(
        { error: '비디오 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('[ExtractSubtitles] Starting subtitle extraction for video:', videoId);

    // 플랫폼별 Referer 설정
    const refererMap: Record<string, string> = {
      'tiktok': 'https://www.tiktok.com/',
      'douyin': 'https://www.douyin.com/',
    };

    // 비디오 다운로드
    let videoResponse = await fetch(finalVideoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': refererMap[platform] || 'https://www.tiktok.com/',
      },
    });

    // CDN URL 재시도 (query parameter 제거)
    if (!videoResponse.ok && finalVideoUrl.includes('?')) {
      const isCDN = finalVideoUrl.includes('tiktokcdn') ||
                    finalVideoUrl.includes('douyinpic') ||
                    finalVideoUrl.includes('xhscdn') ||
                    finalVideoUrl.includes('api.apify.com');

      if (isCDN) {
        console.warn('[ExtractSubtitles] Retrying without query parameters...');
        const baseUrl = finalVideoUrl.split('?')[0];

        const retryResponse = await fetch(baseUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': refererMap[platform] || 'https://www.tiktok.com/',
          },
        });

        if (retryResponse.ok) {
          console.log('[ExtractSubtitles] Retry successful');
          videoResponse = retryResponse;
        }
      }
    }

    if (!videoResponse.ok) {
      console.error('[ExtractSubtitles] Video fetch failed:', videoResponse.status);

      // 🆕 403 Forbidden: CDN URL 만료 - 프론트엔드에서 재크롤링 트리거
      if (videoResponse.status === 403) {
        console.warn('[ExtractSubtitles] 403 Forbidden detected - CDN URL expired, client should trigger recrawl');
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
        { error: '영상을 불러올 수 없습니다. 다시 시도해주세요.' },
        { status: videoResponse.status }
      );
    }

    // Validate Content-Type
    const contentType = videoResponse.headers.get('Content-Type');
    if (!contentType || !(contentType.includes('video') || contentType.includes('octet-stream'))) {
      console.error('[ExtractSubtitles] Invalid Content-Type:', contentType);
      return NextResponse.json(
        { error: '영상 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const buffer = await videoResponse.arrayBuffer();

    // Validate file size (at least 50KB for a valid video)
    if (buffer.byteLength < 50000) {
      console.error('[ExtractSubtitles] File too small:', buffer.byteLength, 'bytes');
      return NextResponse.json(
        { error: '영상 파일이 너무 작습니다. 유효한 영상이 아닙니다.' },
        { status: 400 }
      );
    }

    // Whisper API 제한: 25MB
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (buffer.byteLength > MAX_FILE_SIZE) {
      console.error('[ExtractSubtitles] File too large:', buffer.byteLength, 'bytes');
      return NextResponse.json(
        { error: `영상이 너무 깁니다 (제한: 25MB, 현재: ${(buffer.byteLength / (1024 * 1024)).toFixed(1)}MB)` },
        { status: 413 }
      );
    }

    console.log('[ExtractSubtitles] Video file size:', (buffer.byteLength / (1024 * 1024)).toFixed(2), 'MB');

    // OpenAI Whisper API를 사용한 자막 추출
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('[ExtractSubtitles] OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: '서버 설정 오류: OpenAI API 키가 없습니다.' },
        { status: 500 }
      );
    }

    // Whisper API를 위한 FormData 생성
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: 'audio/mpeg' }), `video_${videoId}.mp3`);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'srt');
    // 언어 자동 감지 - language 파라미터 생략

    console.log('[ExtractSubtitles] Calling OpenAI Whisper API...');

    const whisperResponse = await fetchWithRetry(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
      }
    );

    if (!whisperResponse.ok) {
      const errorData = await whisperResponse.json().catch(() => ({}));
      console.error('[ExtractSubtitles] Whisper API error:', whisperResponse.status, errorData);

      // 구체적인 에러 메시지 분석
      if (whisperResponse.status === 400) {
        const error = errorData?.error?.message || '';
        if (error.includes('audio')) {
          return NextResponse.json(
            { error: '영상에서 음성을 감지할 수 없습니다.' },
            { status: 400 }
          );
        }
      } else if (whisperResponse.status === 429) {
        return NextResponse.json(
          { error: 'API 요청이 제한되었습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        );
      } else if (whisperResponse.status >= 500) {
        return NextResponse.json(
          { error: 'OpenAI 서버에 일시적 오류가 발생했습니다. 다시 시도해주세요.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: errorData?.error?.message || '자막 추출 중 오류가 발생했습니다.' },
        { status: whisperResponse.status }
      );
    }

    const srtContent = await whisperResponse.text();

    if (!srtContent || srtContent.trim().length === 0) {
      return NextResponse.json(
        { error: '자막 추출 결과가 비어있습니다.' },
        { status: 400 }
      );
    }

    console.log('[ExtractSubtitles] ✅ Subtitle extraction successful');

    // 포맷에 따라 변환
    const filePrefix = platform === 'douyin' ? 'douyin' : 'tiktok';
    let content = srtContent;
    let fileName = `${filePrefix}_${videoId}_subtitles.srt`;
    let fileExt = 'srt';

    if (format === 'text') {
      content = parseSrtToText(srtContent);
      fileName = `${filePrefix}_${videoId}_subtitles.txt`;
      fileExt = 'txt';
    }

    // 파일 반환
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[ExtractSubtitles] Error:', error);

    // 타임아웃 에러
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { error: '자막 추출 시간이 초과되었습니다. 영상이 너무 길 수 있습니다.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '자막 추출 중 오류 발생',
      },
      { status: 500 }
    );
  }
}
