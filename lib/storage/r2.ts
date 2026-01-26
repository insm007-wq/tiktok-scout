import crypto from 'crypto';

/**
 * 파일 해시 생성 (중복 방지)
 */
function generateFileHash(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
}

/**
 * 썸네일과 비디오를 R2에 업로드
 */
export async function uploadMediaToR2(
  thumbnailUrl?: string,
  videoUrl?: string
): Promise<{ thumbnail?: string; video?: string }> {
  const results = {
    thumbnail: undefined as string | undefined,
    video: undefined as string | undefined,
  };

  try {
    // 썸네일 업로드
    if (thumbnailUrl) {
      try {
        const thumbResult = await uploadToR2(thumbnailUrl, 'thumbnail');
        if (thumbResult) {
          results.thumbnail = thumbResult;
        }
      } catch (error) {
        console.error('[R2] Thumbnail upload failed:', error);
      }
    }

    // 비디오 업로드
    if (videoUrl) {
      try {
        const videoResult = await uploadToR2(videoUrl, 'video');
        if (videoResult) {
          results.video = videoResult;
        }
      } catch (error) {
        console.error('[R2] Video upload failed:', error);
      }
    }
  } catch (error) {
    console.error('[R2] Upload failed:', error);
  }

  return results;
}

/**
 * CDN URL을 R2에 업로드
 */
async function uploadToR2(
  cdnUrl: string,
  type: 'thumbnail' | 'video'
): Promise<string | undefined> {
  try {
    if (!cdnUrl) {
      return undefined;
    }

    const hash = generateFileHash(cdnUrl);
    const ext = type === 'thumbnail' ? 'jpg' : 'mp4';
    const key = `${type}s/${hash}.${ext}`;

    // 서버 API를 통해 R2에 업로드
    const response = await fetch('/api/upload-to-r2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: cdnUrl,
        type,
        key,
      }),
    });

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error(`[R2] Upload ${type} failed:`, error);
    return undefined;
  }
}
