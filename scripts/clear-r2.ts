import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * R2 스토리지 초기화 스크립트
 * 용도: thumbnails/ 및 video/ 폴더의 모든 파일 삭제
 *
 * 사용법:
 *   npx ts-node scripts/clear-r2.ts
 *
 * 효과:
 *   1. R2 버킷의 모든 파일 조회
 *   2. thumbnails/ 및 video/ 폴더의 모든 파일 삭제
 *   3. 빈 폴더 구조만 남음
 */

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tiktok-videos-storage'

async function clearR2() {
  try {
    console.log('🔌 R2에 연결 중...')
    console.log(`   버킷: ${BUCKET_NAME}`)

    // 1️⃣ 모든 파일 조회
    console.log('\n📊 R2 파일 조회 중...')

    const listResponse = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
      })
    )

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('✅ R2에 파일이 없습니다')
      return
    }

    console.log(`   총 파일: ${listResponse.Contents.length}개`)

    // 2️⃣ thumbnails/ 및 video/ 폴더의 파일만 필터링
    const filesToDelete = listResponse.Contents.filter((file) => {
      const key = file.Key
      return key && (key.startsWith('thumbnails/') || key.startsWith('video/'))
    })

    console.log(`   삭제 대상: ${filesToDelete.length}개`)

    if (filesToDelete.length === 0) {
      console.log('✅ 삭제할 파일이 없습니다')
      return
    }

    // 3️⃣ 파일 타입별 분류
    const thumbCount = filesToDelete.filter((f) => f.Key?.startsWith('thumbnails/')).length
    const videoCount = filesToDelete.filter((f) => f.Key?.startsWith('video/')).length

    console.log(`   • thumbnails/: ${thumbCount}개`)
    console.log(`   • video/: ${videoCount}개`)

    // 4️⃣ 배치 삭제 (최대 1000개씩)
    console.log('\n🗑️  파일 삭제 중...')

    let deletedCount = 0
    for (let i = 0; i < filesToDelete.length; i += 1000) {
      const batch = filesToDelete.slice(i, i + 1000)

      try {
        await r2Client.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: {
              Objects: batch.map((file) => ({
                Key: file.Key!,
              })),
            },
          })
        )

        deletedCount += batch.length
        console.log(`   ✅ ${deletedCount}/${filesToDelete.length}개 삭제 완료`)
      } catch (error) {
        console.error(`   ❌ 배치 삭제 실패:`, error instanceof Error ? error.message : error)
        throw error
      }
    }

    console.log('\n✅ 삭제 완료!')
    console.log(`   • 삭제된 파일: ${deletedCount}개`)
    console.log(`   • thumbnails/ 폴더: 비움`)
    console.log(`   • video/ 폴더: 비움`)

    console.log('\n📝 다음 단계:')
    console.log('   1. 캐시도 초기화하세요:')
    console.log('      npx ts-node scripts/clear-cache.ts')
    console.log('   2. 앱을 재시작하세요:')
    console.log('      npm run dev')
    console.log('   3. "꿀템 틱톡" 검색해서 새로 R2에 업로드되는지 확인하세요')

  } catch (error) {
    console.error('❌ 오류 발생:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

clearR2()
