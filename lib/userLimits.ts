import { Collection, Db, ObjectId } from 'mongodb'
import { connectToDatabase } from './mongodb'

// 환경변수에서 기본 일일 할당량 설정
const DEFAULT_DAILY_LIMIT = parseInt(process.env.DEFAULT_DAILY_LIMIT || '20', 10)

interface User {
  _id?: ObjectId
  email: string  // Primary Key
  name?: string
  image?: string
  phone?: string
  password?: string
  address?: string
  marketingConsent?: boolean
  wantsTextbook?: boolean
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
  isAdmin?: boolean  // 관리자 여부
  isApproved?: boolean  // 가입 승인 여부
  isVerified?: boolean  // SMS 인증 여부
  isWithdrawn?: boolean  // 회원 탈퇴 여부
  withdrawnAt?: Date  // 탈퇴 일시
  withdrawalExpiresAt?: Date  // 재가입 허용 일시 (탈퇴 + 14일)
  hasAccessCode?: boolean  // 접근 코드 입력 여부
  accessCodeUsedAt?: Date  // 코드 입력 시점
  expiryDays?: number  // 접근 코드 만료 기간 (기본: 30일, 프리미엄: 90일)
  lastCodeEnteredAt?: Date  // 마지막으로 코드를 입력한 시간 (업그레이드/다운그레이드 시도 시)
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

/**
 * 전체 사용자 목록 조회 (검색, 필터링, 페이지네이션)
 */
export async function getAllUsers(
  filters?: {
    search?: string
    status?: 'all' | 'active' | 'inactive' | 'banned'
    role?: 'all' | 'admin' | 'user'
    approved?: 'all' | 'approved' | 'pending'
  },
  pagination?: {
    page?: number
    limit?: number
  }
): Promise<{ users: User[]; total: number }> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const page = pagination?.page || 1
    const limit = pagination?.limit || 20
    const skip = (page - 1) * limit

    // 쿼리 조건 구성
    const query: any = {}

    // 검색 조건
    if (filters?.search) {
      const searchRegex = { $regex: filters.search, $options: 'i' }
      query.$or = [
        { email: searchRegex },
        { name: searchRegex },
        { phone: searchRegex },
      ]
    }

    // 상태 필터
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'active') {
        query.isActive = true
        query.isBanned = false
      } else if (filters.status === 'inactive') {
        query.isActive = false
      } else if (filters.status === 'banned') {
        query.isBanned = true
      }
    }

    // 권한 필터
    if (filters?.role && filters.role !== 'all') {
      query.isAdmin = filters.role === 'admin'
    }

    // 승인 상태 필터
    if (filters?.approved && filters.approved !== 'all') {
      query.isApproved = filters.approved === 'approved'
    }

    const users = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments(query)

    return { users, total }
  } catch (error) {
    console.error('❌ getAllUsers 실패:', error)
    return { users: [], total: 0 }
  }
}

/**
 * 사용자 차단
 */
export async function banUser(
  email: string,
  adminEmail: string,
  reason?: string
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const result = await collection.findOneAndUpdate(
      { email },
      {
        $set: {
          isBanned: true,
          bannedAt: new Date(),
          bannedReason: reason || '관리자에 의한 차단',
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    if (result) {
      console.log(`✅ [banUser] ${adminEmail}이 ${email} 사용자를 차단했습니다. 사유: ${reason}`)
    }
    return result !== null
  } catch (error) {
    console.error('❌ banUser 실패:', error)
    return false
  }
}

/**
 * 사용자 차단 해제
 */
export async function unbanUser(email: string, adminEmail: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const result = await collection.findOneAndUpdate(
      { email },
      {
        $set: {
          isBanned: false,
          bannedAt: undefined,
          bannedReason: undefined,
          updatedAt: new Date(),
        },
        $unset: { bannedAt: '', bannedReason: '' },
      },
      { returnDocument: 'after' }
    )

    if (result) {
      console.log(`✅ [unbanUser] ${adminEmail}이 ${email} 사용자의 차단을 해제했습니다`)
    }
    return result !== null
  } catch (error) {
    console.error('❌ unbanUser 실패:', error)
    return false
  }
}

/**
 * 사용자 활성화/비활성화 토글
 */
export async function toggleUserActive(
  email: string,
  adminEmail: string,
  isActive: boolean
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const result = await collection.findOneAndUpdate(
      { email },
      {
        $set: {
          isActive,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    if (result) {
      const status = isActive ? '활성화' : '비활성화'
      console.log(`✅ [toggleUserActive] ${adminEmail}이 ${email} 사용자를 ${status}했습니다`)
    }
    return result !== null
  } catch (error) {
    console.error('❌ toggleUserActive 실패:', error)
    return false
  }
}

/**
 * 사용자 관리자 권한 변경
 */
export async function updateUserRole(
  email: string,
  adminEmail: string,
  isAdmin: boolean
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    // 본인을 관리자에서 해제하려고 하는 경우 방지
    if (email === adminEmail && !isAdmin) {
      console.warn(`⚠️ [updateUserRole] 본인의 관리자 권한을 해제할 수 없습니다`)
      return false
    }

    const result = await collection.findOneAndUpdate(
      { email },
      {
        $set: {
          isAdmin,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    if (result) {
      const role = isAdmin ? '관리자' : '일반 사용자'
      console.log(`✅ [updateUserRole] ${adminEmail}이 ${email} 사용자의 권한을 ${role}로 변경했습니다`)
    }
    return result !== null
  } catch (error) {
    console.error('❌ updateUserRole 실패:', error)
    return false
  }
}

/**
 * 사용자 가입 승인
 */
export async function approveUser(email: string, adminEmail: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const result = await collection.findOneAndUpdate(
      { email },
      {
        $set: {
          isApproved: true,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    if (result) {
      console.log(`✅ [approveUser] ${adminEmail}이 ${email} 사용자를 승인했습니다`)
    }
    return result !== null
  } catch (error) {
    console.error('❌ approveUser 실패:', error)
    return false
  }
}

/**
 * 사용자 가입 거절
 */
export async function rejectUser(email: string, adminEmail: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const result = await collection.deleteOne({ email })

    if (result.deletedCount > 0) {
      console.log(`✅ [rejectUser] ${adminEmail}이 ${email} 사용자의 가입을 거절했습니다`)
    }
    return result.deletedCount > 0
  } catch (error) {
    console.error('❌ rejectUser 실패:', error)
    return false
  }
}

/**
 * 새로운 사용자 생성 (회원가입 시)
 * isApproved를 false로 설정하여 관리자 승인 대기 상태로 생성
 * invitationCode가 DONBOK/FORMAN이면 hasAccessCode: true로 설정
 */
export async function createUser(userData: {
  email: string
  name?: string
  phone?: string
  password?: string
  address?: string
  marketingConsent?: boolean
  wantsTextbook?: boolean
  provider?: string
  providerId?: string
  isApproved?: boolean
  invitationCode?: string
}): Promise<User> {
  const { db } = await connectToDatabase()
  const collection = getUsersCollection(db)

  const now = new Date()

  // 초대 코드 검증 (DONBOK 또는 FORMNA)
  let hasAccessCode = false
  let expiryDays: number | undefined = undefined
  const code = userData.invitationCode?.trim().toUpperCase()

  if (code === 'DONBOK') {
    hasAccessCode = true
    expiryDays = 90
  } else if (code === 'FORMNA') {
    hasAccessCode = true
    expiryDays = 30
  }

  const user: User = {
    email: userData.email,
    name: userData.name,
    phone: userData.phone,
    provider: userData.provider || 'credentials',
    providerId: userData.providerId,
    dailyLimit: DEFAULT_DAILY_LIMIT,
    remainingLimit: DEFAULT_DAILY_LIMIT,
    todayUsed: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    isActive: true,
    isBanned: false,
    isOnline: false,
    lastActive: now,
    lastLogin: new Date(0), // Never logged in
    createdAt: now,
    updatedAt: now,
    isAdmin: false,
    isApproved: userData.isApproved ?? false,
    // 마케팅 동의 저장
    marketingConsent: userData.marketingConsent ?? false,
    // 교재 배송 희망 저장
    wantsTextbook: userData.wantsTextbook ?? false,
    // 유효한 초대 코드 입력 시만 hasAccessCode: true
    hasAccessCode,
    ...(hasAccessCode && { accessCodeUsedAt: now, expiryDays }),
  }

  // password는 선택적으로 추가
  if (userData.password) {
    (user as any).password = userData.password
  }

  // address는 선택적으로 추가
  if (userData.address) {
    (user as any).address = userData.address
  }

  const result = await collection.insertOne(user)

  return {
    ...user,
    _id: result.insertedId,
  }
}

/**
 * 전화번호로 사용자 조회
 */
export async function getUserByPhone(phone: string): Promise<User | null> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const user = await collection.findOne({ phone })
    return user || null
  } catch (error) {
    console.error('❌ getUserByPhone 실패:', error)
    return null
  }
}

/**
 * 사용자를 SMS 인증 완료 상태로 표시
 */
export async function markUserAsVerified(email: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const result = await collection.updateOne(
      { email },
      {
        $set: {
          isVerified: true,
          updatedAt: new Date(),
        },
      }
    )

    return result.modifiedCount > 0
  } catch (error) {
    console.error('❌ markUserAsVerified 실패:', error)
    return false
  }
}

/**
 * 사용자 회원 탈퇴 처리
 * Soft Delete 방식으로 데이터 보존, 14일간 재가입 불가
 */
export async function withdrawUser(email: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const now = new Date()
    // 14일 후 재가입 허용
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const result = await collection.findOneAndUpdate(
      { email },
      {
        $set: {
          isWithdrawn: true,
          withdrawnAt: now,
          withdrawalExpiresAt: expiresAt,
          isActive: false,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    if (result) {
      console.log(`✅ [withdrawUser] ${email} 사용자가 탈퇴했습니다. 재가입 허용: ${expiresAt.toISOString().split('T')[0]}`)
    }
    return result !== null
  } catch (error) {
    console.error('❌ withdrawUser 실패:', error)
    return false
  }
}

/**
 * 사용자의 탈퇴 상태 확인
 * - 'active': 정상 회원 (탈퇴하지 않음)
 * - 'withdrawn': 탈퇴 후 2주 미경과 (재가입 불가)
 * - 'expired': 탈퇴 후 2주 경과 (재가입 가능, 기존 계정 삭제 필요)
 */
export async function checkWithdrawnStatus(
  email: string
): Promise<'active' | 'withdrawn' | 'expired'> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const user = await collection.findOne({ email })

    // 사용자가 없거나 탈퇴하지 않은 경우
    if (!user || !user.isWithdrawn) {
      return 'active'
    }

    const now = new Date()
    const expiresAt = user.withdrawalExpiresAt

    // 재가입 허용 일시가 지났는지 확인
    if (expiresAt && now >= expiresAt) {
      return 'expired'
    }

    // 탈퇴 후 2주 미경과
    return 'withdrawn'
  } catch (error) {
    console.error('❌ checkWithdrawnStatus 실패:', error)
    return 'active'
  }
}

/**
 * 사용자 정보 업데이트
 * 이름, 전화번호, 비밀번호, 마케팅 동의 등 수정 가능
 */
export async function updateUserProfile(
  email: string,
  updates: {
    name?: string
    phone?: string
    password?: string
    address?: string
    marketingConsent?: boolean
    wantsTextbook?: boolean
  }
): Promise<User | null> {
  try {
    const { db } = await connectToDatabase()
    const collection = getUsersCollection(db)

    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    }

    const result = await collection.findOneAndUpdate(
      { email },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result || null
  } catch (error) {
    console.error('❌ updateUserProfile 실패:', error)
    return null
  }
}
