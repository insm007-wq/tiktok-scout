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
  const startTime = Date.now();

  const [thumbnail, video] = await Promise.all([
    thumbnailUrl ? uploadToR2(thumbnailUrl, 'thumbnail') : Promise.resolve(undefined),
    videoUrl ? uploadToR2(videoUrl, 'video') : Promise.resolve(undefined),
  ]);

  const duration = Date.now() - startTime;

  // 업로드 결과 로깅
  const hasThumb = !!thumbnail;
  const hasVideo = !!video;
  const hasCdnThumb = !thumbnail && !!thumbnailUrl;
  const hasCdnVideo = !video && !!videoUrl;

  console.log(`[R2] 📊 Upload results (${duration}ms): Thumbnail=${hasThumb ? '✅' : '❌'}, Video=${hasVideo ? '✅' : '❌'}`);

  if (hasCdnThumb) {
    console.warn(`[R2] ⚠️ FALLBACK: Thumbnail upload failed, using CDN URL (will expire in 24h)`);
  }
  if (hasCdnVideo) {
    console.warn(`[R2] ⚠️ FALLBACK: Video upload failed, using CDN URL (will expire in 24h)`);
  }

  // ✅ NEW: Metrics for monitoring
  if (hasCdnThumb || hasCdnVideo) {
    // TODO: Send to monitoring service (e.g., Sentry, DataDog)
    // For now, log to console for manual monitoring
    console.error(`[R2] ❌ R2_UPLOAD_FALLBACK_USED: thumb=${hasCdnThumb}, video=${hasCdnVideo}, duration=${duration}ms`);
  }

  return { thumbnail, video };
}

/**
 * CDN URL을 R2에 업로드
 */
async function uploadToR2(
  cdnUrl: string,
  type: 'thumbnail' | 'video'
): Promise<string | undefined> {
  try {
    console.log(`[R2] Starting upload for ${type}...`);

    if (!cdnUrl) {
      console.warn(`[R2] URL is empty for ${type}`);
      return undefined;
    }

    const hash = generateFileHash(cdnUrl);
    const ext = type === 'thumbnail' ? 'jpg' : 'mp4';
    const key = `${type}s/${hash}.${ext}`;

    // 서버 API를 통해 R2에 업로드 (재시도 로직)
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`[R2] API call attempt ${attempt + 1}/3 for ${type}...`);

        const response = await fetch('/api/upload-to-r2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cdnUrl,
            type,
            key,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            console.log(`[R2] ✅ Upload successful on attempt ${attempt + 1}`);
            return data.url;
          }
        } else {
          console.warn(`[R2] ⚠️ API returned ${response.status}`);
          lastError = new Error(`API returned ${response.status}`);
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`[R2] ⚠️ Upload attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : String(error));
      }

      // 마지막 시도가 아니면 지수 백오프 후 재시도
      if (attempt < 2) {
        const waitTime = Math.pow(2, attempt) * 500;
        console.log(`[R2] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    console.error(`[R2] ❌ Upload failed after 3 attempts for ${type}`);
    return undefined;
  } catch (error) {
    console.error(`[R2] ❌ Upload failed for ${type}:`, error instanceof Error ? error.message : error);
    return undefined;
  }
}
