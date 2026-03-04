import { connectToDatabase } from './mongodb'
import { ObjectId } from 'mongodb'
import { getUserDailyLimit, decrementUserQuota } from './userLimits'

// 환경변수에서 설정, 기본값 20
const DEFAULT_DAILY_LIMIT = parseInt(process.env.API_DAILY_LIMIT || '20', 10)

interface ApiUsageRecord {
  _id?: ObjectId
  email: string  // Primary Key (email 기반)
  date: string   // YYYY-MM-DD
  count: number
  searches?: Array<{ query?: string; type: 'search' | 'download' | 'subtitles'; timestamp: Date }>
  createdAt?: Date
  updatedAt?: Date
}

interface ApiUsageResponse {
  allowed: boolean
  used: number
  remaining: number
  limit: number
  resetTime: string
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환 (KST 기준)
 */
function getTodayDate(): string {
  const today = new Date()
  const kstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000)
  return kstDate.toISOString().split('T')[0]
}

/**
 * 내일 자정을 ISO 형식으로 반환
 */
function getTomorrowMidnight(): string {
  const today = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow.toISOString().split('T')[0] + 'T00:00:00Z'
}

/**
 * 사용자의 오늘 API 사용량을 확인 (Email 기반)
 */
export async function checkApiUsage(email: string): Promise<ApiUsageResponse> {
  try {
    if (!email) {
      throw new Error('email은 필수입니다')
    }

    const { db } = await connectToDatabase()
    const today = getTodayDate()

    const usersCollection = db.collection('users')
    const usageCollection = db.collection<ApiUsageRecord>('api_usage')

    // users에서 사용자 정보 조회 (할당량 및 상태)
    let user = await usersCollection.findOne({ email })
    console.log(`🔍 checkApiUsage - 사용자 조회 결과:`, {
      email,
      found: !!user,
      isActive: user?.isActive,
      isBanned: user?.isBanned,
      dailyLimit: user?.dailyLimit
    })

    // ✅ 사용자가 없으면 자동 재생성 시도 (기존 사용자 복구)
    if (!user) {
      console.log(`⚠️ checkApiUsage - 사용자 없음, 자동 재생성 시도: ${email}`)

      try {
        // 기본 사용자 정보로 재생성 시도
        const { upsertUser } = await import('./userLimits')
        await upsertUser(email, '', '', 'recovery', 'auto')

        // 재조회
        user = await usersCollection.findOne({ email })

        if (user) {
          console.log(`✅ checkApiUsage - 사용자 자동 생성 성공: ${email}`)
          // 정상 플로우로 계속 진행
        } else {
          throw new Error('재생성 후에도 조회 실패')
        }
      } catch (error) {
        console.error(`❌ checkApiUsage - 사용자 자동 생성 실패: ${email}`, {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        })

        // ✅ 재생성 실패 → limit: -1 (특별한 에러 코드: "재로그인 필요")
        return {
          allowed: false,
          used: 0,
          remaining: 0,
          limit: -1, // -1은 "사용자 없음/재로그인 필요" 신호
          resetTime: getTomorrowMidnight()
        }
      }
    }

    // 비활성화 또는 밴된 사용자 체크
    if (!user.isActive || user.isBanned) {
      console.log(`❌ checkApiUsage - 사용자 비활성/차단됨, isActive: ${user.isActive}, isBanned: ${user.isBanned}`)
      return {
        allowed: false,
        used: 0,
        remaining: 0,
        limit: user.dailyLimit || DEFAULT_DAILY_LIMIT,
        resetTime: getTomorrowMidnight()
      }
    }

    // 오늘의 api_usage 기록 조회
    const usageRecord = await usageCollection.findOne({
      email,
      date: today
    })

    const used = usageRecord?.count ?? 0
    const limit = user.dailyLimit || DEFAULT_DAILY_LIMIT
    const remaining = Math.max(0, limit - used)
    const allowed = used < limit

    // ✅ 할당량 리셋 체크 (lastResetDate와 오늘 날짜 비교)
    const userLastResetDate = user.lastResetDate || '1970-01-01'
    if (userLastResetDate !== today && used === 0) {
      // 오늘이 새로운 날이고 아직 사용량이 없으면 users 컬렉션 리셋
      try {
        const usersCollection = db.collection('users')
        await usersCollection.updateOne(
          { email },
          {
            $set: {
              todayUsed: 0,
              lastResetDate: today,
              updatedAt: new Date()
            }
          }
        )
        console.log(`🔄 할당량 리셋 - email: ${email}, limit: ${limit}`)
      } catch (resetError) {
        console.log(`⚠️  할당량 리셋 실패 (무시됨):`, resetError)
      }
    }

    console.log(`📊 checkApiUsage - email: ${email}, used: ${used}/${limit}, allowed: ${allowed}`)

    return {
      allowed,
      used,
      remaining,
      limit,
      resetTime: getTomorrowMidnight()
    }
  } catch (error) {
    console.error('❌ API 사용량 확인 에러:', {
      email,
      error: error instanceof Error ? error.message : error
    })
    throw error
  }
}

/**
 * 사용자의 API 사용량을 1 증가시킴 (Email 기반)
 * Atomic 연산 사용으로 동시성 보장
 */
export async function incrementApiUsage(
  email: string,
  query?: string,
  type: 'search' | 'download' | 'subtitles' = 'search'
): Promise<ApiUsageResponse> {
  try {
    if (!email) {
      throw new Error('email은 필수입니다')
    }

    const { db } = await connectToDatabase()
    const today = getTodayDate()

    const usageCollection = db.collection<ApiUsageRecord>('api_usage')
    const usersCollection = db.collection('users')
    const dailyLimit = await getUserDailyLimit(email)

    // Atomic upsert: email + date를 유니크 키로 사용
    const result = await usageCollection.findOneAndUpdate(
      {
        email,
        date: today
      },
      {
        $inc: { count: 1 },
        $push: { searches: { ...(query ? { query } : {}), type, timestamp: new Date() } },
        $set: { updatedAt: new Date() },
        $setOnInsert: {
          email,
          date: today,
          createdAt: new Date()
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    )

    const updatedCount = result?.count ?? 1
    const remaining = Math.max(0, dailyLimit - updatedCount)
    const allowed = updatedCount < dailyLimit

    // ✅ users 컬렉션의 remainingLimit도 동시에 업데이트
    try {
      await usersCollection.updateOne(
        { email },
        {
          $set: {
            todayUsed: updatedCount,
            remainingLimit: remaining,
            lastResetDate: today,
            updatedAt: new Date()
          }
        }
      )
      console.log(`✅ users 컬렉션 업데이트 - email: ${email}, remaining: ${remaining}, used: ${updatedCount}`)
    } catch (updateError) {
      console.warn(`⚠️  users 컬렉션 업데이트 실패 (계속 진행):`, updateError)
    }

    console.log(`📈 incrementApiUsage - email: ${email}, count: ${updatedCount}/${dailyLimit}`)

    return {
      allowed,
      used: updatedCount,
      remaining,
      limit: dailyLimit,
      resetTime: getTomorrowMidnight()
    }
  } catch (error) {
    console.error('❌ API 사용량 업데이트 에러:', {
      email,
      error: error instanceof Error ? error.message : error
    })
    throw error
  }
}

/**
 * 사용자의 모든 API 사용 기록 조회 (Email 기반)
 */
export async function getUserApiUsageHistory(
  email: string,
  limit: number = 30
): Promise<ApiUsageRecord[]> {
  try {
    if (!email) {
      throw new Error('email은 필수입니다')
    }

    if (limit < 1 || limit > 100) {
      limit = 30
    }

    const { db } = await connectToDatabase()
    const usageCollection = db.collection<ApiUsageRecord>('api_usage')

    const records = await usageCollection
      .find({ email })
      .sort({ date: -1 })
      .limit(limit)
      .toArray()

    return records
  } catch (error) {
    console.error('❌ API 사용 기록 조회 에러:', {
      email,
      error: error instanceof Error ? error.message : error
    })
    throw error
  }
}

/**
 * 사용자의 오늘 사용량만 조회 (Email 기반)
 */
export async function getTodayUsage(email: string) {
  try {
    if (!email) {
      throw new Error('email은 필수입니다')
    }

    const { db } = await connectToDatabase()
    const today = getTodayDate()

    const usageCollection = db.collection<ApiUsageRecord>('api_usage')
    const dailyLimit = await getUserDailyLimit(email)

    const record = await usageCollection.findOne({
      email,
      date: today
    })

    const used = record?.count ?? 0

    return {
      used,
      remaining: Math.max(0, dailyLimit - used),
      limit: dailyLimit
    }
  } catch (error) {
    console.error('❌ 오늘 사용량 조회 에러:', {
      email,
      error: error instanceof Error ? error.message : error
    })
    throw error
  }
}

/**
 * 특정 사용자의 특정 날짜 사용량 조회 (Email 기반)
 */
export async function getUsageByDate(email: string, date: string) {
  try {
    if (!email || !date) {
      throw new Error('email과 date는 필수입니다')
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('날짜는 YYYY-MM-DD 형식이어야 합니다')
    }

    const { db } = await connectToDatabase()
    const usageCollection = db.collection<ApiUsageRecord>('api_usage')

    const record = await usageCollection.findOne({
      email,
      date
    })

    return {
      date,
      used: record?.count ?? 0,
      email: record?.email ?? 'unknown'
    }
  } catch (error) {
    console.error('❌ 날짜별 사용량 조회 에러:', {
      email,
      date,
      error: error instanceof Error ? error.message : error
    })
    throw error
  }
}

/**
 * 모든 사용자의 통계 조회 (관리자용)
 */
export async function getGlobalStats() {
  try {
    const { db } = await connectToDatabase()
    const usageCollection = db.collection<ApiUsageRecord>('api_usage')
    const today = getTodayDate()

    // 오늘의 총 검색 수
    const todayStats = await usageCollection
      .aggregate([
        { $match: { date: today } },
        {
          $group: {
            _id: null,
            totalSearches: { $sum: '$count' },
            totalUsers: { $sum: 1 },
            avgPerUser: { $avg: '$count' }
          }
        }
      ])
      .toArray()

    return {
      date: today,
      totalSearches: todayStats[0]?.totalSearches ?? 0,
      totalUsers: todayStats[0]?.totalUsers ?? 0,
      avgPerUser: Math.round((todayStats[0]?.avgPerUser ?? 0) * 100) / 100,
      defaultLimit: DEFAULT_DAILY_LIMIT
    }
  } catch (error) {
    console.error('❌ 전역 통계 조회 에러:', error)
    throw error
  }
}
