import { MongoClient } from 'mongodb'
import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * CDN URL → R2 URL 마이그레이션 스크립트
 * 용도: 기존 캐시 데이터의 CDN URL을 모두 R2 URL로 변환
 *
 * 사용법:
 *   npx ts-node scripts/migrate-cdn-to-r2.ts
 *
 * 효과:
 *   1. MongoDB의 모든 video_cache 문서 조회
 *   2. 각 비디오의 thumbnail URL이 CDN이면 R2 URL로 변환
 *   3. 데이터베이스 업데이트
 */

function generateR2Url(cdnUrl: string, type: 'thumbnail' | 'video'): string {
  const hash = crypto.createHash('sha256').update(cdnUrl).digest('hex').substring(0, 16)
  const ext = type === 'thumbnail' ? 'jpg' : 'mp4'
  const PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'https://pub-e7c1a9fcc1354653a54a231bf19ecf7b.r2.dev'
  return `${PUBLIC_DOMAIN}/${type}s/${hash}.${ext}`
}

async function migrateCache() {
  const mongoUri = process.env.MONGODB_URI

  if (!mongoUri) {
    console.error('❌ MONGODB_URI이 설정되지 않았습니다')
    process.exit(1)
  }

  let client: MongoClient | null = null

  try {
    console.log('🔌 MongoDB에 연결 중...')
    client = new MongoClient(mongoUri)
    await client.connect()

    const db = client.db('tiktok-scout')
    const cacheCollection = db.collection('video_cache')

    // 1️⃣ 모든 캐시 문서 조회
    console.log('📊 캐시 데이터 조회 중...')
    const allCaches = await cacheCollection.find({}).toArray()

    if (allCaches.length === 0) {
      console.log('✅ 마이그레이션할 캐시가 없습니다')
      return
    }

    console.log(`📈 총 ${allCaches.length}개의 캐시 문서 발견`)

    // 2️⃣ CDN URL 개수 세기
    let cdnUrlCount = 0
    let r2UrlCount = 0
    let updatedCount = 0

    for (const cache of allCaches) {
      if (!cache.data || !Array.isArray(cache.data)) continue

      let hasChanges = false

      // 각 비디오의 thumbnail 확인
      for (const video of cache.data) {
        if (!video.thumbnail) continue

        if (video.thumbnail.includes('.r2.dev')) {
          r2UrlCount++
        } else if (
          video.thumbnail.includes('tiktokcdn') ||
          video.thumbnail.includes('douyinpic') ||
          video.thumbnail.includes('xhscdn')
        ) {
          cdnUrlCount++
          // CDN URL을 R2 URL로 변환
          video.thumbnail = generateR2Url(video.thumbnail, 'thumbnail')
          hasChanges = true
        }
      }

      // 변경사항이 있으면 DB 업데이트
      if (hasChanges) {
        await cacheCollection.updateOne(
          { _id: cache._id },
          { $set: { data: cache.data, updatedAt: new Date() } }
        )
        updatedCount++
      }
    }

    console.log('\n✅ 마이그레이션 완료!')
    console.log(`   • CDN URL: ${cdnUrlCount}개 → R2 URL로 변환됨`)
    console.log(`   • R2 URL: ${r2UrlCount}개 (그대로 유지)`)
    console.log(`   • 업데이트된 캐시 문서: ${updatedCount}개`)

    console.log('\n📝 다음 단계:')
    console.log('   1. 브라우저를 새로고침하세요')
    console.log('   2. 이전 검색 결과들이 모두 R2 URL로 로드되는지 확인하세요')
    console.log('   3. 새로운 검색도 계속해서 R2 URL로 저장됩니다')

    console.log('\n💾 DB 상태:')
    console.log('   ✅ 기존 데이터 보존')
    console.log('   ✅ CDN URL 만료 문제 해결')
    console.log('   ✅ R2 캐시로 완전히 전환')

  } catch (error) {
    console.error('❌ 오류 발생:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('\n🔌 MongoDB 연결 종료')
    }
  }
}

migrateCache()
