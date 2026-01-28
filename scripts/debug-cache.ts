import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

/**
 * 캐시 상태 디버깅 스크립트
 * 용도: "꿀템 틱톡" 검색 결과 분석
 *
 * 사용법:
 *   npx ts-node scripts/debug-cache.ts "꿀템 틱톡"
 */

async function debugCache() {
  const mongoUri = process.env.MONGODB_URI
  const keyword = process.argv[2] || '꿀템 틱톡'

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

    // 1️⃣ 해당 검색어의 캐시 찾기
    const cacheKey = `tiktok_${keyword}_all`
    console.log(`\n🔍 검색 중: "${keyword}"`)
    console.log(`   캐시 키: ${cacheKey}`)

    const cache = await cacheCollection.findOne({ cacheKey })

    if (!cache) {
      console.log('❌ 캐시를 찾을 수 없습니다')
      console.log('💡 팁: 앱에서 한 번 검색 후 다시 시도하세요')
      return
    }

    // 2️⃣ 캐시 기본 정보
    console.log('\n📊 캐시 정보:')
    console.log(`   • 총 영상: ${cache.data?.length || 0}개`)
    console.log(`   • 생성일: ${new Date(cache.createdAt).toLocaleString()}`)
    console.log(`   • 마지막 접근: ${new Date(cache.lastAccessedAt).toLocaleString()}`)
    console.log(`   • 접근 횟수: ${cache.accessCount}회`)

    // 3️⃣ URL 타입별 통계
    if (cache.data && Array.isArray(cache.data)) {
      const urlStats = {
        r2: 0,
        cdn: 0,
        unknown: 0,
        failed: 0,
      }

      const urlExamples: Record<string, string[]> = {
        r2: [],
        cdn: [],
        unknown: [],
      }

      cache.data.forEach((video: any) => {
        const thumb = video.thumbnail
        if (!thumb) {
          urlStats.failed++
          return
        }

        if (thumb.includes('.r2.dev')) {
          urlStats.r2++
          if (urlExamples.r2.length < 2) urlExamples.r2.push(thumb.substring(0, 80))
        } else if (
          thumb.includes('tiktokcdn') ||
          thumb.includes('douyinpic') ||
          thumb.includes('xhscdn')
        ) {
          urlStats.cdn++
          if (urlExamples.cdn.length < 2) urlExamples.cdn.push(thumb.substring(0, 80))
        } else {
          urlStats.unknown++
          if (urlExamples.unknown.length < 2) urlExamples.unknown.push(thumb.substring(0, 80))
        }
      })

      console.log('\n📈 URL 타입 통계:')
      console.log(`   • R2: ${urlStats.r2}개 ✅`)
      console.log(`   • CDN: ${urlStats.cdn}개 ⚠️`)
      console.log(`   • Unknown: ${urlStats.unknown}개 ❓`)
      console.log(`   • 실패: ${urlStats.failed}개 ❌`)

      if (urlExamples.r2.length > 0) {
        console.log('\n   📍 R2 URL 예시:')
        urlExamples.r2.forEach((url) => console.log(`      ${url}...`))
      }

      if (urlExamples.cdn.length > 0) {
        console.log('\n   📍 CDN URL 예시 (24시간 후 만료):')
        urlExamples.cdn.forEach((url) => console.log(`      ${url}...`))
      }

      // 문제 분석
      console.log('\n🔧 분석:')
      if (urlStats.cdn > 0) {
        console.log(`   ⚠️ ${urlStats.cdn}개의 CDN URL이 여전히 캐시되어 있습니다`)
        console.log('   💡 해결책: 다시 캐시를 초기화하세요')
        console.log('      npx ts-node scripts/clear-cache.ts')
      } else if (urlStats.r2 === cache.data.length) {
        console.log('   ✅ 모든 URL이 R2로 정상 저장되었습니다!')
        console.log('   📝 다음: 브라우저에서 새로고침 후 확인하세요')
      }
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

debugCache()
