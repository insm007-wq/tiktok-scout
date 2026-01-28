import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tiktok-videos-storage';
const PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'https://pub-e7c1a9fcc1354653a54a231bf19ecf7b.r2.dev';

/**
 * R2에 파일이 이미 존재하는지 확인
 */
async function fileExists(key: string, retries = 2): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await r2Client.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
      );
      return true;
    } catch (error: any) {
      if (attempt === retries) {
        return false;
      }
      // 지수 백오프 대기
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, type, key } = body;

    if (!url || !type || !key) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 이미 존재하면 기존 URL 반환
    if (await fileExists(key)) {
      return NextResponse.json({
        success: true,
        url: `${PUBLIC_DOMAIN}/${key}`,
      });
    }

    // CDN에서 파일 다운로드
    console.log(`[R2] Downloading from CDN: ${url.substring(0, 100)}...`);

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    // URL 기반으로 Referer 설정
    if (url.includes('tiktok.com') || url.includes('tiktokcdn')) {
      headers['Referer'] = 'https://www.tiktok.com/';
      headers['Origin'] = 'https://www.tiktok.com';
    } else if (url.includes('douyin.com') || url.includes('douyinpic.com')) {
      headers['Referer'] = 'https://www.douyin.com/';
      headers['Origin'] = 'https://www.douyin.com';
    } else if (url.includes('xiaohongshu') || url.includes('xhscdn')) {
      headers['Referer'] = 'https://www.xiaohongshu.com/';
      headers['Origin'] = 'https://www.xiaohongshu.com';
    }

    // 이미지 타입일 경우 Accept 헤더 추가
    if (type === 'thumbnail') {
      headers['Accept'] = 'image/webp,image/apng,image/avif,image/*,*/*;q=0.8';
    }

    // 30초 타임아웃
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    console.log(`[R2] 📥 CDN response status: ${response.status}`);

    // CDN URL은 시간 제한 파라미터로 인해 만료될 수 있음 → 재시도 (파라미터 제거)
    if (!response.ok && url.includes('?')) {
      const isCDN = url.includes('tiktokcdn') || url.includes('douyinpic') || url.includes('xhscdn');

      if (isCDN) {
        console.warn(`[R2] ⚠️ CDN download failed (${response.status}), retrying without query params...`);
        console.log(`[R2] 📍 Original URL: ${url.substring(0, 100)}...`);

        // URL에서 query string 제거 후 재시도
        const baseUrl = url.split('?')[0];
        console.log(`[R2] 🔄 Retrying with base URL: ${baseUrl.substring(0, 100)}...`);

        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), 30000);

        try {
          response = await fetch(baseUrl, { headers, signal: retryController.signal });
          clearTimeout(retryTimeout);

          console.log(`[R2] 📥 Retry CDN response status: ${response.status}`);

          if (response.ok) {
            console.log(`[R2] ✅ Retry successful with base URL`);
          } else {
            console.warn(`[R2] ⚠️ Retry also failed: ${response.status}`);
          }
        } catch (retryError) {
          console.error(`[R2] ⚠️ Retry also failed:`, retryError instanceof Error ? retryError.message : retryError);
          clearTimeout(retryTimeout);
        }
      }
    }

    if (!response.ok) {
      console.error(`[R2] ❌ Failed to download from CDN: ${response.status}`);
      console.error(`[R2] ❌ URL: ${url.substring(0, 150)}...`);
      console.error(`[R2] ❌ Type: ${type}, Key: ${key}`);
      return NextResponse.json(
        { error: `Failed to download from CDN: ${response.status}` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = type === 'thumbnail' ? 'image/jpeg' : 'video/mp4';

    console.log(`[R2] Downloaded: ${(buffer.length / 1024).toFixed(1)}KB`);

    // R2에 업로드 (재시도 로직)
    console.log(`[R2] Uploading to R2: ${key}...`);
    let uploadSuccess = false;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`[R2] R2 upload attempt ${attempt + 1}/3...`);
        await r2Client.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000', // 1년 캐싱
          })
        );
        uploadSuccess = true;
        console.log(`[R2] ✅ R2 upload successful on attempt ${attempt + 1}`);
        break;
      } catch (error: any) {
        lastError = error;
        console.warn(`[R2] ⚠️ R2 upload attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : String(error));

        if (attempt === 2) {
          console.error(`[R2] ❌ All 3 R2 upload attempts failed for ${key}`);
          throw error;
        }

        // 지수 백오프 대기
        const waitTime = Math.pow(2, attempt) * 500;
        console.log(`[R2] Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    if (!uploadSuccess) {
      console.error(`[R2] ❌ Upload failed after 3 attempts`);
      return NextResponse.json(
        { error: 'Failed to upload to R2', details: lastError?.message },
        { status: 500 }
      );
    }

    const publicUrl = `${PUBLIC_DOMAIN}/${key}`;
    console.log(`[R2] ✅ Uploaded ${type}: ${key} (${(buffer.length / 1024).toFixed(1)}KB)`);

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error: any) {
    console.error('[R2] Upload failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
