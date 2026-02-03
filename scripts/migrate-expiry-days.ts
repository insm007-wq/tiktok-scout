import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function migrateExpiryDays() {
  console.log('🔄 기존 사용자 만료 기간 마이그레이션 시작...')

  const mongoUrl = process.env.MONGODB_URI
  if (!mongoUrl) {
    throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다')
  }

  const client = new MongoClient(mongoUrl)
  await client.connect()
  const db = client.db(process.env.DB_NAME || 'tiktok-scout')
  const collection = db.collection('users')

  // 1. expiryDays가 없는 모든 사용자에게 30일 설정 (기존 사용자들)
  const usersToMigrate = await collection.countDocuments({
    expiryDays: { $exists: false }
  })

  console.log(`📊 마이그레이션 대상: ${usersToMigrate}명`)

  if (usersToMigrate === 0) {
    console.log('✅ 마이그레이션할 사용자가 없습니다.')
    process.exit(0)
  }

  // 기존 사용자를 30일(FORMNA)로 설정
  // accessCodeUsedAt을 오늘(2024-02-03)로 설정 → 3월 5일 만료
  const result = await collection.updateMany(
    { expiryDays: { $exists: false } },
    {
      $set: {
        expiryDays: 30,
        accessCodeUsedAt: new Date(), // 오늘부터 30일 카운트
        hasAccessCode: true, // 기존 사용자도 코드 있는 것으로 표시
        updatedAt: new Date()
      }
    }
  )

  console.log(`✅ 마이그레이션 완료:`)
  console.log(`   - 조회: ${result.matchedCount}명`)
  console.log(`   - 업데이트: ${result.modifiedCount}명`)

  // 검증 1: expiryDays가 없는 사용자 확인
  const remaining = await collection.countDocuments({
    expiryDays: { $exists: false }
  })

  if (remaining === 0) {
    console.log('✅ 검증 1 완료: 모든 사용자에게 expiryDays 설정됨')
  } else {
    console.warn(`⚠️ 경고: ${remaining}명이 아직 마이그레이션되지 않았습니다`)
  }

  // 검증 2: expiryDays 분포 확인
  const distribution = await collection.aggregate([
    { $group: { _id: '$expiryDays', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray()

  console.log('✅ 검증 2: expiryDays 분포')
  distribution.forEach((item: any) => {
    const days = item._id || '없음'
    const planName = item._id === 30 ? 'FORMNA(30일)' : item._id === 90 ? 'DONBOK(90일)' : '미설정'
    console.log(`   - ${planName}: ${item.count}명`)
  })

  await client.close()
  console.log('✅ 마이그레이션 완료!')
  process.exit(0)
}

migrateExpiryDays().catch((error) => {
  console.error('❌ 마이그레이션 실패:', error)
  process.exit(1)
})
