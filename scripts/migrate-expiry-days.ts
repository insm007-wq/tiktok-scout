import { connectToDatabase } from '../lib/mongodb'

async function migrateExpiryDays() {
  console.log('🔄 기존 사용자 만료 기간 마이그레이션 시작...')

  const { db } = await connectToDatabase()
  const collection = db.collection('users')

  // expiryDays가 없는 모든 사용자 조회
  const usersToMigrate = await collection.countDocuments({
    expiryDays: { $exists: false }
  })

  console.log(`📊 마이그레이션 대상: ${usersToMigrate}명`)

  if (usersToMigrate === 0) {
    console.log('✅ 마이그레이션할 사용자가 없습니다.')
    process.exit(0)
  }

  // 모든 기존 사용자를 기본 30일로 설정
  const result = await collection.updateMany(
    { expiryDays: { $exists: false } },
    {
      $set: {
        expiryDays: 30,
        updatedAt: new Date()
      }
    }
  )

  console.log(`✅ 마이그레이션 완료:`)
  console.log(`   - 조회: ${result.matchedCount}명`)
  console.log(`   - 업데이트: ${result.modifiedCount}명`)

  // 검증
  const remaining = await collection.countDocuments({
    expiryDays: { $exists: false }
  })

  if (remaining === 0) {
    console.log('✅ 검증 완료: 모든 사용자에게 expiryDays 설정됨')
  } else {
    console.warn(`⚠️ 경고: ${remaining}명이 아직 마이그레이션되지 않았습니다`)
  }

  process.exit(0)
}

migrateExpiryDays().catch((error) => {
  console.error('❌ 마이그레이션 실패:', error)
  process.exit(1)
})
