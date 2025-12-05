import { Collection, Db, ObjectId } from 'mongodb'
import { connectToDatabase } from './mongodb'

// 환경변수에서 기본 일일 할당량 설정
const DEFAULT_DAILY_LIMIT = parseInt(process.env.DEFAULT_DAILY_LIMIT || '20', 10)

interface User {
  _id?: ObjectId
  email: string  // Primary Key
  name?: string
  image?: string
  provider: string
  providerId?: string
  dailyLimit: number
  remainingLimit: number
  todayUsed: number
  lastResetDate: string
  isActive: boolean  // true: 활성, false: 비활성화
  isBanned: boolean
  bannedAt?: Date
  bannedReason?: string
  isOnline: boolean
  lastActive: Date
  lastLogin: Date
  createdAt: Date
  updatedAt: Date
}

function getUsersCollection(db: Db): Collection<User> {
  return db.collection<User>('users')
}

/**
 * 사용자 정보를 MongoDB에 저장/업데이트
 * Email을 Primary Key로 사용
 * 로그인 시마다 호출되며, lastLogin을 갱신합니다
 */
export async function upsertUser(
  email: string,
  name?: string,
  image?: string,
  provider?: string,
  providerId?: string
): Promise<User> {
  // ✅ 이메일 필수 검증
  if (!email || email.trim() === '') {
    throw new Error('이메일은 필수입니다')
  }

  // ✅ 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    throw new Error('올바른 이메일 형식이 아닙니다')
  }

  const { db } = await connectToDatabase()

  const collection = getUsersCollection(db)

  // Email을 Primary Key로 사용
  await collection.createIndex({ email: 1 }, { unique: true })

  const now = new Date()

  const result = await collection.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        image,
        provider: provider || 'unknown',
        providerId: providerId || 'unknown',
        lastLogin: now,
        lastActive: now,
        updatedAt: now,
      },
      $setOnInsert: {
        email,
        dailyLimit: DEFAULT_DAILY_LIMIT,
        remainingLimit: DEFAULT_DAILY_LIMIT,
        todayUsed: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
        isActive: true,
        isBanned: false,
        isOnline: true,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' }
  )

  return result!
}



/**
 * 사용자의 일일 제한 횟수 조회 (email 기반)
 */
export async function getUserDailyLimit(email: string): Promise<number> {
  const { db } = await connectToDatabase()

  try {
    const collection = getUsersCollection(db)
    const user = await collection.findOne({ email })
    return user?.dailyLimit ?? 20 // 기본값: 20
  } catch (error) {
    console.error('❌ 사용자 할당량 조회 에러:', error)
    return 20
  }
}

/**
 * 사용자의 할당량을 원자적으로 차감
 * Atomic 연산으로 동시성 보장
 */
export async function decrementUserQuota(email: string): Promise<boolean> {
  const { db } = await connectToDatabase()
  const collection = getUsersCollection(db)

  // ✅ KST 기준으로 오늘 날짜 계산 (apiUsage.ts와 동일)
  const today = new Date()
  const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
  const todayStr = kstDate.toISOString().split('T')[0]

  const result = await collection.findOneAndUpdate(
    {
      email,
      remainingLimit: { $gt: 0 }, // 0보다 클 때만
      isActive: true,
      isBanned: false,
    },
    {
      $inc: { remainingLimit: -1, todayUsed: 1 },
      $set: { lastResetDate: todayStr, updatedAt: new Date() },
    },
    { returnDocument: 'after' }
  )

  return result !== null
}

/**
 * 사용자의 lastActive를 갱신
 * 미들웨어에서 API 호출마다 호출되어 실시간 접속 상태 추적
 */
export async function updateLastActive(email: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const result = await collection.findOneAndUpdate(
      { email },
      {
        $set: {
          lastActive: new Date(),
          isOnline: true,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    if (result) {
      console.log(`✅ [updateLastActive] 성공: ${email}`)
    } else {
      console.warn(`⚠️ [updateLastActive] 사용자를 찾을 수 없음: ${email}`)
    }
    return result !== null
  } catch (error) {
    console.error(`❌ [updateLastActive] 데이터베이스 오류 (${email}):`, error)
    return false
  }
}

/**
 * 사용자를 오프라인으로 설정
 * 로그아웃 시 호출
 */
export async function setUserOffline(email: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const result = await collection.findOneAndUpdate(
      { email },
      {
        $set: {
          isOnline: false,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    return result !== null
  } catch (error) {
    console.error('❌ setUserOffline 실패:', error)
    return false
  }
}

/**
 * 이메일로 사용자 조회
 * auth.ts 에서 차단 여부 확인할 때 사용
 */
export async function getUserById(email: string): Promise<User | null> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const user = await collection.findOne({ email })
    return user || null
  } catch (error) {
    console.error('❌ getUserById 실패:', error)
    return null
  }
}
