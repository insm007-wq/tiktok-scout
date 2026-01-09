import { NextRequest, NextResponse } from 'next/server';

interface FetchVideoUrlRequest {
  videoId: string;
  query: string;
  dateRange?: string;
}

// 인메모리 캐시 (videoId → videoUrl)
const videoUrlCache = new Map<string, string>();

export async function POST(req: NextRequest) {
  try {
    const body: FetchVideoUrlRequest = await req.json();
    const { videoId, query, dateRange } = body;

    console.log(`[Douyin VideoUrl] API 호출됨: videoId=${videoId}, query=${query}, dateRange=${dateRange}`);

    // 캐시 확인
    const cached = videoUrlCache.get(videoId);
    if (cached) {
      console.log(`[Douyin VideoUrl] 캐시 히트: ${videoId}, URL=${cached}`);
      return NextResponse.json({
        success: true,
        videoId,
        videoUrl: cached,
        fromCache: true,
      });
    }

    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Apify API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    console.log(`[Douyin VideoUrl] URL 가져오기 시작: ${videoId}`);

    // cloudcharlestom 액터 사용 (빠름)
    const actorId = 'cloudcharlestom~douyin-search-scraper';

    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: query,
          count: 10, // 최소한만 요청
        }),
      }
    );

    const runData = await runRes.json();
    if (!runRes.ok) {
      console.error('[Douyin VideoUrl] Run 시작 실패:', runData);
      return NextResponse.json({ error: 'API 호출 실패' }, { status: 500 });
    }

    const runId = runData.data.id;

    // 폴링 (최대 30초, 빠른 액터는 5~10초면 완료)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 60; // 30초 (0.5초 * 60)

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 500));

      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );
      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED') {
        return NextResponse.json({ error: 'API 실행 실패' }, { status: 500 });
      }
    }

    if (status !== 'SUCCEEDED') {
      return NextResponse.json({ error: '타임아웃' }, { status: 504 });
    }

    // 결과 조회
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );
    const dataset = await datasetRes.json();

    if (!Array.isArray(dataset) || dataset.length === 0) {
      return NextResponse.json({ error: '결과 없음' }, { status: 404 });
    }

    // videoId로 매칭
    const video = dataset.find((item: any) => item.id === videoId);

    if (!video) {
      // videoId가 정확히 매칭 안 되면 첫 번째 결과 사용
      console.warn(`[Douyin VideoUrl] videoId ${videoId} 매칭 실패, 첫 결과 사용`);
    }

    const targetVideo = video || dataset[0];
    const originalVideoUrl = targetVideo.video?.video_url || targetVideo.video?.download_url;

    if (!originalVideoUrl) {
      return NextResponse.json({ error: 'videoUrl 없음' }, { status: 404 });
    }

    // 프록시 URL 생성 (브라우저 직접 접근 403 우회)
    const proxyUrl = `/api/video/stream?url=${encodeURIComponent(originalVideoUrl)}&platform=douyin`;

    console.log(`[Douyin VideoUrl] 원본 URL: ${originalVideoUrl}`);
    console.log(`[Douyin VideoUrl] 프록시 URL: ${proxyUrl}`);

    // 캐시 저장 (프록시 URL)
    videoUrlCache.set(videoId, proxyUrl);

    console.log(`[Douyin VideoUrl] ✅ 완료: ${videoId}`);

    return NextResponse.json({
      success: true,
      videoId,
      videoUrl: proxyUrl,
      fromCache: false,
    });
  } catch (error) {
    console.error('[Douyin VideoUrl] 오류:', error);
    return NextResponse.json(
      { error: '비디오 URL 가져오기 실패' },
      { status: 500 }
    );
  }
}
