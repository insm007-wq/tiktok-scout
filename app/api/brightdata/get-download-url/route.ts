import { NextRequest, NextResponse } from 'next/server';
import { getFromCache, setCache } from '@/lib/cache';

interface DownloadUrlRequest {
  webVideoUrl: string;  // "https://www.tiktok.com/@user/video/123"
}

interface DownloadUrlResponse {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  expiresAt?: number;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<DownloadUrlResponse>> {
  try {
    const body: DownloadUrlRequest = await req.json();
    const { webVideoUrl } = body;

    // 입력 검증
    if (!webVideoUrl || typeof webVideoUrl !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'webVideoUrl is required',
        },
        { status: 400 }
      );
    }

    // TikTok URL 형식 검증
    if (!webVideoUrl.includes('tiktok.com') && !webVideoUrl.includes('douyin.com')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid TikTok URL format',
        },
        { status: 400 }
      );
    }

    console.log('[DownloadURL] Processing:', webVideoUrl);

    // API 키 확인
    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Apify API key not configured',
        },
        { status: 500 }
      );
    }

    // 캐시 확인 (6시간 TTL)
    const cacheKey = `download-url:${webVideoUrl}`;
    const cached = getFromCache(cacheKey, 'tiktok-downloader');
    if (cached) {
      console.log('[DownloadURL] Cache hit for:', webVideoUrl);
      return NextResponse.json({
        success: true,
        ...cached,
      });
    }

    // TikTok Scraper를 사용해서 단일 비디오 정보 가져오기
    console.log('[DownloadURL] Calling TikTok Scraper for URL:', webVideoUrl);

    const actorId = 'clockworks~tiktok-scraper';

    // Run 시작
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postURLs: [webVideoUrl],  // postURLs 파라미터 사용
          downloadVideos: true,
          includeVideoStatistics: true,
        }),
      }
    );

    const runData = await runRes.json();

    if (!runRes.ok) {
      console.error('[DownloadURL] Run creation failed:', runData);
      return NextResponse.json(
        {
          success: false,
          error: '영상 정보를 가져올 수 없습니다. URL을 확인해주세요.',
        },
        { status: 500 }
      );
    }

    const runId = runData.data.id;
    console.log('[DownloadURL] Run ID:', runId);

    // Polling 대기
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 60;
    let waitTime = 500;
    const maxWaitTime = 5000;

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );
      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED') {
        console.error('[DownloadURL] Actor failed:', statusData.data.statusMessage);
        return NextResponse.json(
          {
            success: false,
            error: '영상을 처리할 수 없습니다.',
          },
          { status: 500 }
        );
      }

      if (status === 'RUNNING' || status === 'READY') {
        await new Promise((r) => setTimeout(r, waitTime));
        waitTime = Math.min(waitTime * 2, maxWaitTime);
      }
    }

    // Dataset 조회
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );

    const dataset = await datasetRes.json();

    if (!Array.isArray(dataset) || dataset.length === 0) {
      console.error('[DownloadURL] No data returned from actor');
      return NextResponse.json(
        {
          success: false,
          error: '다운로드 가능한 정보를 찾을 수 없습니다.',
        },
        { status: 404 }
      );
    }

    // Dataset에서 다운로드 URL 추출
    const item = dataset[0];

    // 응답 필드 로깅 (디버깅)
    console.log('[DownloadURL] Response fields:', Object.keys(item));
    console.log('[DownloadURL] Dataset length:', dataset.length);

    // 처음 500자만 로깅 (크기 제한)
    const itemStr = JSON.stringify(item);
    console.log('[DownloadURL] Full item (first 1000 chars):', itemStr.substring(0, 1000));

    // 우선순위순으로 다운로드 URL 찾기
    const downloadUrl =
      item.download ||
      item.downloadUrl ||
      item.video ||
      item.videoUrl ||
      item.downloadedUrl ||
      item.url ||
      item.downloadLink ||
      item.videoLink;

    if (!downloadUrl) {
      console.error('[DownloadURL] No download URL found in response');
      console.error('[DownloadURL] Available fields:', {
        download: item.download,
        downloadUrl: item.downloadUrl,
        video: item.video,
        videoUrl: item.videoUrl,
        downloadedUrl: item.downloadedUrl,
        url: item.url,
        downloadLink: item.downloadLink,
        videoLink: item.videoLink,
      });
      return NextResponse.json(
        {
          success: false,
          error: '다운로드 URL을 추출할 수 없습니다.',
        },
        { status: 404 }
      );
    }

    // 파일명 생성
    const videoId = webVideoUrl.split('/video/')[1]?.split('?')[0] || 'video';
    const timestamp = Date.now();
    const fileName = `tiktok_video_${videoId}_${timestamp}.mp4`;

    // 파일 크기 (선택사항)
    const fileSize = item.fileSize || item.size;

    // 캐시 저장 (6시간 TTL)
    const responseData = {
      downloadUrl,
      fileName,
      fileSize,
      expiresAt: Date.now() + 6 * 60 * 60 * 1000,
    };

    setCache(cacheKey, 'tiktok-downloader', responseData);

    console.log('[DownloadURL] Success:', {
      videoId,
      fileName,
      downloadUrl: downloadUrl.substring(0, 50) + '...',
    });

    return NextResponse.json({
      success: true,
      ...responseData,
    });
  } catch (error) {
    console.error('[DownloadURL] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}
