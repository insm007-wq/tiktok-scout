import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { isCdnUrl } from '@/lib/utils/validateMediaUrl';
import { fetchSingleVideoUrl } from '@/lib/utils/fetch-single-video-url';

async function fetchThumbnailFromPage(webVideoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(webVideoUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      console.warn('[Bookmarks Refresh All] Page fetch failed', {
        status: res.status,
        statusText: res.statusText,
        url: webVideoUrl,
      });
      return null;
    }

    const html = await res.text();

    const ogImageMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    );
    if (ogImageMatch?.[1]) {
      return ogImageMatch[1];
    }

    const twitterImageMatch = html.match(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    );
    if (twitterImageMatch?.[1]) {
      return twitterImageMatch[1];
    }

    return null;
  } catch (error) {
    console.error('[Bookmarks Refresh All] Unexpected error while fetching page:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    const bookmarks = await db
      .collection('bookmarks')
      .find({ email: session.user.email })
      .toArray();

    if (bookmarks.length === 0) {
      return NextResponse.json({
        success: true,
        updatedCount: 0,
        total: 0,
      });
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const failed: string[] = [];

    for (const bookmark of bookmarks) {
      try {
        const videoData: any = bookmark.videoData || {};

        const thumbRaw = videoData.thumbnail;
        const thumbStr =
          typeof thumbRaw === 'string'
            ? thumbRaw
            : thumbRaw && typeof thumbRaw === 'object' && 'url' in thumbRaw
            ? (thumbRaw.url as string)
            : '';

        const videoUrlStr = typeof videoData.videoUrl === 'string' ? videoData.videoUrl : '';

        const needsThumbRefresh = !thumbStr || isCdnUrl(thumbStr);
        const needsVideoRefresh = !videoUrlStr || isCdnUrl(videoUrlStr);

        if (!needsThumbRefresh && !needsVideoRefresh) {
          skippedCount += 1;
          continue;
        }

        const webVideoUrl: string | undefined =
          typeof videoData.webVideoUrl === 'string'
            ? videoData.webVideoUrl
            : typeof videoData.videoUrl === 'string'
            ? videoData.videoUrl
            : undefined;

        if (!webVideoUrl) {
          failed.push(String(bookmark.videoId ?? bookmark._id));
          continue;
        }

        const platform = bookmark.platform as 'tiktok' | 'douyin';

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
              const data = (await oembedRes.json()) as {
                thumbnail_url?: string;
                thumbnailUrl?: string;
                thumbnail?: string;
              };
              newThumbnail = data.thumbnail_url || data.thumbnailUrl || data.thumbnail || null;
            } else {
              console.warn('[Bookmarks Refresh All] TikTok oEmbed failed', {
                status: oembedRes.status,
                statusText: oembedRes.statusText,
              });
            }
          } catch (error) {
            console.error('[Bookmarks Refresh All] TikTok oEmbed error:', error);
          }
        }

        if (!newThumbnail && needsThumbRefresh) {
          newThumbnail = await fetchThumbnailFromPage(webVideoUrl);
        }

        let newVideoUrl: string | null = null;
        try {
          const apiKey = process.env.APIFY_API_KEY;
          if (apiKey && platform === 'tiktok' && needsVideoRefresh) {
            const result = await fetchSingleVideoUrl(webVideoUrl, 'tiktok', apiKey);
            if (result.videoUrl) {
              newVideoUrl = result.videoUrl;
            } else if (result.error) {
              console.warn('[Bookmarks Refresh All] fetchSingleVideoUrl error:', result.error);
            }
          }
        } catch (error) {
          console.error('[Bookmarks Refresh All] Error while refreshing video URL:', error);
        }

        const updateSet: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (newThumbnail) {
          updateSet['videoData.thumbnail'] = newThumbnail;
        }
        if (newVideoUrl) {
          updateSet['videoData.videoUrl'] = newVideoUrl;
        }

        // 실제로 변경할 값이 없으면 스킵
        if (Object.keys(updateSet).length === 1) {
          skippedCount += 1;
          continue;
        }

        await db.collection('bookmarks').updateOne(
          { _id: bookmark._id },
          {
            $set: updateSet,
          },
        );

        updatedCount += 1;
      } catch (error) {
        console.error('[Bookmarks Refresh All] Error processing bookmark:', {
          id: bookmark._id,
          videoId: bookmark.videoId,
          error,
        });
        failed.push(String(bookmark.videoId ?? bookmark._id));
      }
    }

    return NextResponse.json({
      success: true,
      total: bookmarks.length,
      updatedCount,
      skippedCount,
      failedCount: failed.length,
      failedIds: failed,
    });
  } catch (error) {
    console.error('[Bookmarks Refresh All] Unexpected server error:', error);
    return NextResponse.json(
      { error: '전체 썸네일 갱신 중 서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

