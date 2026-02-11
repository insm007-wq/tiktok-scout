/**
 * Cloudflare R2 버킷 정리 스크립트
 *
 * 썸네일/영상 파일이 R2에 쌓일 때 수동으로 목록 확인·삭제할 수 있습니다.
 * 이 앱은 더 이상 R2에 업로드하지 않으며, 예전 데이터 또는 외부 워커가 올린 데이터 정리용입니다.
 *
 * 사용법:
 *   npx tsx scripts/clean-r2.ts list              # 객체 목록만 출력 (기본 최대 1000개)
 *   npx tsx scripts/clean-r2.ts list --max 5000   # 최대 5000개까지
 *   npx tsx scripts/clean-r2.ts delete --older-than-days 30   # 30일 지난 객체 삭제 (실제 삭제 전 확인 프롬프트)
 *   npx tsx scripts/clean-r2.ts delete --prefix thumb/        # thumb/ 접두사 객체만 삭제
 *
 * 필요 환경 변수 (R2 버킷 접근용):
 *   R2_ACCOUNT_ID         - Cloudflare 계정 ID
 *   R2_ACCESS_KEY_ID      - R2 API 토큰 Access Key
 *   R2_SECRET_ACCESS_KEY - R2 API 토큰 Secret Key
 *   R2_BUCKET_NAME       - 버킷 이름
 */

import 'dotenv/config';
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  type _Object,
} from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

function getClient(): S3Client {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error(
      '[clean-r2] R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY 가 필요합니다.'
    );
    process.exit(1);
  }
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function listObjects(
  client: S3Client,
  maxKeys: number,
  prefix?: string
): Promise<_Object[]> {
  const all: _Object[] = [];
  let continuationToken: string | undefined;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: Math.min(1000, maxKeys - all.length),
      ContinuationToken: continuationToken,
      Prefix: prefix,
    });
    const out = await client.send(cmd);
    if (out.Contents) all.push(...out.Contents);
    continuationToken = out.NextContinuationToken;
  } while (continuationToken && all.length < maxKeys);
  return all;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';
  const maxIdx = args.indexOf('--max');
  const maxKeys = maxIdx >= 0 ? parseInt(args[maxIdx + 1], 10) || 1000 : 1000;
  const olderIdx = args.indexOf('--older-than-days');
  const olderThanDays =
    olderIdx >= 0 ? parseInt(args[olderIdx + 1], 10) : undefined;
  const prefixIdx = args.indexOf('--prefix');
  const prefix = prefixIdx >= 0 ? args[prefixIdx + 1] : undefined;

  if (!bucket) {
    console.error('[clean-r2] R2_BUCKET_NAME 이 필요합니다.');
    process.exit(1);
  }

  const client = getClient();

  if (command === 'list') {
    const objects = await listObjects(client, maxKeys, prefix);
    console.log(`[clean-r2] 버킷 "${bucket}" 객체 수: ${objects.length}\n`);
    const byPrefix: Record<string, number> = {};
    let totalSize = 0;
    for (const o of objects) {
      const key = o.Key ?? '';
      const p = key.includes('/') ? key.split('/')[0] + '/' : '(root)';
      byPrefix[p] = (byPrefix[p] ?? 0) + 1;
      totalSize += o.Size ?? 0;
    }
    console.log('접두사별 개수:', byPrefix);
    console.log(
      `총 크기: ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`
    );
    objects.slice(0, 30).forEach((o) => {
      const age = o.LastModified
        ? ` (${Math.floor((Date.now() - o.LastModified.getTime()) / 86400000)}일 전)`;
        : '';
      console.log(`  ${o.Key}${age}`);
    });
    if (objects.length > 30) {
      console.log(`  ... 외 ${objects.length - 30}개`);
    }
    return;
  }

  if (command === 'delete') {
    const objects = await listObjects(client, 10_000, prefix);
    let toDelete = objects;
    if (olderThanDays != null && olderThanDays > 0) {
      const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
      toDelete = objects.filter(
        (o) => o.LastModified && o.LastModified.getTime() < cutoff
      );
    }
    if (toDelete.length === 0) {
      console.log('[clean-r2] 삭제할 객체가 없습니다.');
      return;
    }
    console.log(`[clean-r2] 삭제 예정: ${toDelete.length}개`);
    console.log('처음 10개:', toDelete.slice(0, 10).map((o) => o.Key));
    console.log('\n실제로 삭제하려면 터미널에서 "yes" 입력 후 엔터.');
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
      rl.question('> ', resolve);
    });
    rl.close();
    if (answer?.trim().toLowerCase() !== 'yes') {
      console.log('[clean-r2] 취소됨.');
      return;
    }
    const BATCH = 1000;
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += BATCH) {
      const batch = toDelete.slice(i, i + BATCH);
      const result = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: batch.map((o) => ({ Key: o.Key })),
            Quiet: true,
          },
        })
      );
      const errs = result.Errors ?? [];
      if (errs.length) {
        console.error('[clean-r2] 일부 삭제 실패:', errs);
      }
      deleted += batch.length;
      console.log(`[clean-r2] 삭제 진행: ${deleted}/${toDelete.length}`);
    }
    console.log(`[clean-r2] 완료. ${deleted}개 삭제됨.`);
    return;
  }

  console.log('사용법: list | delete [--older-than-days N] [--prefix PREFIX] [--max N]');
  process.exit(1);
}

main().catch((err) => {
  console.error('[clean-r2]', err);
  process.exit(1);
});
