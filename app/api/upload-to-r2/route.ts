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

    const response = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[R2] Failed to download: ${response.status}`);
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
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
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
        break;
      } catch (error: any) {
        if (attempt === 2) throw error;
        // 지수 백오프 대기
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }

    if (!uploadSuccess) {
      return NextResponse.json(
        { error: 'Failed to upload to R2' },
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
