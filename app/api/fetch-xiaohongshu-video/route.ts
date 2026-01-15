import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { postUrl } = await req.json();
    const apiKey = process.env.APIFY_API_KEY;

    if (!postUrl) {
      return NextResponse.json({ error: 'Post URL required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Apify API key not configured' },
        { status: 500 }
      );
    }

    console.log('[Fetch Xiaohongshu Video] Starting actor for URL:', postUrl);

    // 1. Start Video Downloader actor
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/easyapi~rednote-xiaohongshu-video-downloader/runs?token=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: [postUrl] }),
      }
    );

    if (!runRes.ok) {
      const errorData = await runRes.text();
      console.error('[Fetch Xiaohongshu Video] Actor start failed:', errorData);
      throw new Error('Failed to start actor');
    }

    const runData = await runRes.json();
    const runId = runData.data.id;
    console.log('[Fetch Xiaohongshu Video] Actor run started:', runId);

    // 2. Poll for completion (max 30 attempts = 30 seconds)
    let status = 'RUNNING';
    let attempt = 0;
    const maxAttempts = 30;

    while ((status === 'RUNNING' || status === 'READY') && attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000));

      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );
      const statusData = await statusRes.json();
      status = statusData.data.status;
      attempt++;

      if (status === 'SUCCEEDED') {
        console.log('[Fetch Xiaohongshu Video] Actor completed successfully');
        break;
      }
      if (status === 'FAILED' || status === 'ABORTED') {
        console.error('[Fetch Xiaohongshu Video] Actor failed with status:', status);
        throw new Error('Actor execution failed');
      }
    }

    if (status !== 'SUCCEEDED') {
      console.error('[Fetch Xiaohongshu Video] Actor timeout after', maxAttempts, 'attempts');
      throw new Error('Actor timeout');
    }

    // 3. Get dataset results
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );
    const dataset = await datasetRes.json();

    if (!dataset || dataset.length === 0) {
      console.error('[Fetch Xiaohongshu Video] No dataset results');
      throw new Error('No results from actor');
    }

    // 4. Extract video URL from results
    const result = dataset[0];

    // Check for actor-reported errors
    if (result?.result?.error === true) {
      console.error('[Fetch Xiaohongshu Video] Actor reported error:', result);
      throw new Error('영상 추출 실패: Apify actor에서 에러를 보고했습니다');
    }

    // Check if medias array exists
    if (!result.result.medias || !Array.isArray(result.result.medias)) {
      console.error('[Fetch Xiaohongshu Video] No medias array in result:', result);
      throw new Error('미디어 정보를 찾을 수 없습니다.');
    }

    // Find video media (not image)
    const videoMedia = result.result.medias.find((media: any) => media.type === 'video');

    if (!videoMedia || !videoMedia.url) {
      console.error('[Fetch Xiaohongshu Video] No video found in medias:', result.result.medias);
      throw new Error('포스트에 비디오가 없습니다. 이미지만 있는 포스트입니다.');
    }

    const videoUrl = videoMedia.url;
    console.log('[Fetch Xiaohongshu Video] Video URL extracted:', videoUrl);
    console.log('[Fetch Xiaohongshu Video] Video type:', videoMedia.type);
    console.log('[Fetch Xiaohongshu Video] Video extension:', videoMedia.extension);
    console.log('[Fetch Xiaohongshu Video] Video quality:', videoMedia.quality);

    return NextResponse.json({
      success: true,
      videoUrl,
      thumbnail: result.result.thumbnail,
      duration: result.result.duration,
    });

  } catch (error) {
    console.error('[Fetch Xiaohongshu Video]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch video' },
      { status: 500 }
    );
  }
}
