import { NextRequest, NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/utils/fetch-with-retry';

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, videoId, platform = 'tiktok', webVideoUrl } = await req.json();

    // TikTok과 Douyin만 지원 (Xiaohongshu는 향후 추가)
    if (platform !== 'tiktok' && platform !== 'douyin') {
      return NextResponse.json(
        { error: `${platform}은(는) 자막 추출을 지원하지 않습니다. (현재 TikTok, Douyin만 지원)` },
        { status: 400 }
      );
    }

    let finalVideoUrl = videoUrl;

    // Xiaohongshu on-demand video URL fetching (향후 지원)
    if (platform === 'xiaohongshu' && !videoUrl && webVideoUrl) {
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
      } catch (error) {
        console.error('[ExtractSubtitles] Xiaohongshu video URL fetch failed:', error);
        throw new Error(error instanceof Error ? error.message : '영상 URL을 가져올 수 없습니다.');
      }
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
      'xiaohongshu': 'https://www.xiaohongshu.com/',
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
                    finalVideoUrl.includes('xhscdn');

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

    // SRT 파일 반환 (플랫폼별 파일명)
    const filePrefix = platform === 'douyin' ? 'douyin' : 'tiktok';
    return new NextResponse(srtContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filePrefix}_${videoId}_subtitles.srt"`,
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
