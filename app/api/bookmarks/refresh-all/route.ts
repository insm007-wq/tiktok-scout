import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { isCdnUrl } from '@/lib/utils/validateMediaUrl';
import { fetchSingleVideoUrl } from '@/lib/utils/fetch-single-video-url';

const REFRESH_CONCURRENCY = 6; // 동시에 처리할 북마크 수 (새로고침 속도 개선)

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

type BookmarkDoc = {
  _id: ObjectId;
  videoId: string;
  platform: string;
  videoData?: Record<string, unknown>;
  [key: string]: unknown;
};

type ProcessResult = { status: 'updated' | 'skipped' | 'failed'; failId?: string };

async function processOneBookmark(bookmark: BookmarkDoc, db: Db): Promise<ProcessResult> {
  try {
    const videoData: Record<string, unknown> = bookmark.videoData || {};

    const thumbRaw = videoData.thumbnail;
    const thumbStr =
      typeof thumbRaw === 'string'
        ? thumbRaw
        : thumbRaw && typeof thumbRaw === 'object' && thumbRaw !== null && 'url' in thumbRaw
        ? (thumbRaw as { url: string }).url
        : '';

    const videoUrlStr = typeof videoData.videoUrl === 'string' ? videoData.videoUrl : '';

    const needsThumbRefresh = !thumbStr || isCdnUrl(thumbStr);
    const needsVideoRefresh = !videoUrlStr || isCdnUrl(videoUrlStr);

    if (!needsThumbRefresh && !needsVideoRefresh) {
      return { status: 'skipped' };
    }

    const webVideoUrl: string | undefined =
      typeof videoData.webVideoUrl === 'string'
        ? videoData.webVideoUrl
        : typeof videoData.videoUrl === 'string'
        ? videoData.videoUrl
        : undefined;

    if (!webVideoUrl) {
      return { status: 'failed', failId: String(bookmark.videoId ?? bookmark._id) };
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

    if (Object.keys(updateSet).length === 1) {
      return { status: 'skipped' };
    }

    await db.collection('bookmarks').updateOne(
      { _id: bookmark._id },
      { $set: updateSet },
    );

    return { status: 'updated' };
  } catch (error) {
    console.error('[Bookmarks Refresh All] Error processing bookmark:', {
      id: bookmark._id,
      videoId: bookmark.videoId,
      error,
    });
    return { status: 'failed', failId: String(bookmark.videoId ?? bookmark._id) };
  }
}

/** 동시성 제한으로 여러 작업 실행 */
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    const bookmarks = await db
      .collection<BookmarkDoc>('bookmarks')
      .find({ email: session.user.email })
      .toArray();

    if (bookmarks.length === 0) {
      return NextResponse.json({
        success: true,
        updatedCount: 0,
        total: 0,
        bookmarks: [],
      });
    }

    const results = await runWithConcurrency(
      bookmarks,
      REFRESH_CONCURRENCY,
      (bookmark) => processOneBookmark(bookmark, db),
    );

    let updatedCount = 0;
    let skippedCount = 0;
    const failed: string[] = [];
    const failedBookmarks: BookmarkDoc[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'updated') updatedCount += 1;
      else if (r.status === 'skipped') skippedCount += 1;
      else if (r.failId) {
        failed.push(r.failId);
        failedBookmarks.push(bookmarks[i]);
      }
    }

    // 실패한 항목 1회 재시도 (타임아웃/일시 오류로 첫 번째에 4개만 갱신되고 두 번째에 5개 되는 현상 완화)
    if (failedBookmarks.length > 0) {
      const retryResults = await Promise.all(
        failedBookmarks.map((b) => processOneBookmark(b, db)),
      );
      const stillFailed: string[] = [];
      for (let j = 0; j < retryResults.length; j++) {
        const r = retryResults[j];
        if (r.status === 'updated') {
          updatedCount += 1;
        } else if (r.failId) {
          stillFailed.push(r.failId);
        }
      }
      failed.length = 0;
      failed.push(...stillFailed);
    }

    // 클라이언트가 추가 GET 요청 없이 목록 갱신할 수 있도록 최신 목록 반환
    const updatedList = await db
      .collection('bookmarks')
      .find({ email: session.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      total: bookmarks.length,
      updatedCount,
      skippedCount,
      failedCount: failed.length,
      failedIds: failed,
      bookmarks: updatedList,
    });
  } catch (error) {
    console.error('[Bookmarks Refresh All] Unexpected server error:', error);
    return NextResponse.json(
      { error: '전체 썸네일 갱신 중 서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

