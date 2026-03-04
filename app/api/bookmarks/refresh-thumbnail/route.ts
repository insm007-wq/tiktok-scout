import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { fetchSingleVideoUrl } from '@/lib/utils/fetch-single-video-url';

interface RefreshThumbnailRequestBody {
  videoId: string;
  platform: string;
}

async function fetchThumbnailFromPage(webVideoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(webVideoUrl, {
      headers: {
        // TikTok/Douyin 쪽에서 일반 브라우저처럼 인식하도록 UA 지정
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      console.warn('[Bookmarks Refresh Thumbnail] Page fetch failed', {
        status: res.status,
        statusText: res.statusText,
        url: webVideoUrl,
      });
      return null;
    }

    const html = await res.text();

    // 1) Open Graph og:image 메타 태그 우선
    const ogImageMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    );
    if (ogImageMatch?.[1]) {
      return ogImageMatch[1];
    }

    // 2) Twitter 카드용 이미지 태그 보조
    const twitterImageMatch = html.match(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    );
    if (twitterImageMatch?.[1]) {
      return twitterImageMatch[1];
    }

    return null;
  } catch (error) {
    console.error('[Bookmarks Refresh Thumbnail] Unexpected error while fetching page:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    let body: RefreshThumbnailRequestBody;
    try {
      body = (await req.json()) as RefreshThumbnailRequestBody;
    } catch {
      return NextResponse.json({ error: '유효하지 않은 JSON 요청입니다.' }, { status: 400 });
    }

    const { videoId, platform } = body;
    if (!videoId || !platform) {
      return NextResponse.json(
        { error: 'videoId와 platform은 필수입니다.' },
        { status: 400 },
      );
    }

    const { db } = await connectToDatabase();

    const bookmark = await db.collection('bookmarks').findOne({
      email: session.user.email,
      videoId,
      platform,
    });

    if (!bookmark) {
      return NextResponse.json(
        { error: '해당 즐겨찾기를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const videoData: any = bookmark.videoData || {};
    const webVideoUrl: string | undefined =
      typeof videoData.webVideoUrl === 'string'
        ? videoData.webVideoUrl
        : typeof videoData.videoUrl === 'string'
        ? videoData.videoUrl
        : undefined;

    if (!webVideoUrl) {
      return NextResponse.json(
        { error: '이 북마크에 저장된 영상 URL이 없습니다.' },
        { status: 400 },
      );
    }

    // TikTok의 경우 oEmbed API를 우선 시도
    let newThumbnail: string | null = null;
    if (platform === 'tiktok') {
      try {
        const oembedRes = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(webVideoUrl)}`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
            },
          },
        );

        if (oembedRes.ok) {
          const data = (await oembedRes.json()) as { thumbnail_url?: string; thumbnailUrl?: string; thumbnail?: string };
          newThumbnail =
            data.thumbnail_url || data.thumbnailUrl || data.thumbnail || null;
        } else {
          console.warn('[Bookmarks Refresh Thumbnail] TikTok oEmbed failed', {
            status: oembedRes.status,
            statusText: oembedRes.statusText,
          });
        }
      } catch (error) {
        console.error('[Bookmarks Refresh Thumbnail] TikTok oEmbed error:', error);
      }
    }

    // oEmbed로 못 찾았으면 HTML에서 og:image 파싱 (Douyin 포함 공통 경로)
    if (!newThumbnail) {
      newThumbnail = await fetchThumbnailFromPage(webVideoUrl);
    }

    if (!newThumbnail) {
      return NextResponse.json(
        { error: '새로운 썸네일 URL을 찾지 못했습니다.' },
        { status: 502 },
      );
    }

    // 선택적으로 비디오 프리뷰 URL도 갱신 (TikTok만 지원)
    let newVideoUrl: string | null = null;
    try {
      const apiKey = process.env.APIFY_API_KEY;
      if (apiKey && platform === 'tiktok') {
        const result = await fetchSingleVideoUrl(webVideoUrl, 'tiktok', apiKey);
        if (result.videoUrl) {
          newVideoUrl = result.videoUrl;
        } else if (result.error) {
          console.warn('[Bookmarks Refresh Thumbnail] fetchSingleVideoUrl error:', result.error);
        }
      }
    } catch (error) {
      console.error('[Bookmarks Refresh Thumbnail] Error while refreshing video URL:', error);
    }

    await db.collection('bookmarks').updateOne(
      {
        email: session.user.email,
        videoId,
        platform,
      },
      {
        $set: {
          'videoData.thumbnail': newThumbnail,
          ...(newVideoUrl && { 'videoData.videoUrl': newVideoUrl }),
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({
      success: true,
      thumbnail: newThumbnail,
      videoUrl: newVideoUrl ?? (typeof videoData.videoUrl === 'string' ? videoData.videoUrl : null),
    });
  } catch (error) {
    console.error('[Bookmarks Refresh Thumbnail] Unexpected server error:', error);
    return NextResponse.json(
      { error: '썸네일 갱신 중 서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

