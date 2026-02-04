import { MongoClient, Db } from 'mongodb'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null
let indexesInitialized = false

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const mongoUri = process.env.MONGODB_URI

  if (!mongoUri) {
    throw new Error('Please define MONGODB_URI in .env.local')
  }

  const client = new MongoClient(mongoUri, {
    maxPoolSize: 100,       // ✅ 동접 300 지원: 100-150이 적정
    minPoolSize: 50,        // 워밍업용
    maxIdleTimeMS: 60000,
    waitQueueTimeoutMS: 2000,
    compressors: ['zlib'],
    zlibCompressionLevel: 6,
    readPreference: 'secondaryPreferred'
  })

  try {
    await client.connect()
    const db = client.db('tiktok-scout')

    cachedClient = client
    cachedDb = db


    // 인덱스 초기화 (최초 1회만)
    if (!indexesInitialized) {
      await initializeIndexes(db)
      indexesInitialized = true
    }

    return { client, db }
  } catch (error) {
    throw error
  }
}

/**
 * MongoDB 인덱스 초기화
 */
async function initializeIndexes(db: Db) {
  try {
    const usageCollection = db.collection('api_usage')
    const usersCollection = db.collection('users')
    const cacheCollection = db.collection('video_cache')

    // api_usage: email + date 복합 인덱스 (email 기반)
    await usageCollection.createIndex(
      { email: 1, date: 1 },
      { unique: true, sparse: true }
    )

    // 조회 성능을 위한 인덱스
    await usageCollection.createIndex({ email: 1, date: -1 })

    // users: email unique 인덱스 (Primary Key)
    await usersCollection.createIndex({ email: 1 }, { unique: true })

    // users: 조회 성능 인덱스
    await usersCollection.createIndex({ isActive: 1, isBanned: 1 })
    await usersCollection.createIndex({ lastActive: -1 })
    await usersCollection.createIndex({ createdAt: -1 })

    // video_cache: TTL 인덱스 (자동 삭제, 24시간 후 만료)
    // background: true = 백그라운드에서 삭제 진행
    // sparse: true = null 값 가진 문서는 무시
    await cacheCollection.createIndex(
      { expiresAt: 1 },
      {
        expireAfterSeconds: 0,
        background: true,
        sparse: true
      }
    )

    // video_cache: 캐시 조회 최적화 (cacheKey unique)
    await cacheCollection.createIndex(
      { cacheKey: 1 },
      { unique: true }
    )

    // video_cache: 검색 필터 (platform, query, dateRange 기반 조회)
    await cacheCollection.createIndex(
      { platform: 1, query: 1, dateRange: 1 }
    )

    // video_cache: 인기 검색어 조회 (자동 갱신용) - 중요!
    await cacheCollection.createIndex({ searchCount: -1 })

    // video_cache: 접근 통계용
    await cacheCollection.createIndex({ accessCount: -1 })

    // video_cache: 최신순 정렬용
    await cacheCollection.createIndex({ createdAt: -1 })

    // video_cache: 최근 접근순 정렬용
    await cacheCollection.createIndex({ lastAccessedAt: -1 })

  } catch (error) {
    if ((error as any).code === 48 || (error as any).code === 68) {
      // 인덱스 이미 존재 (정상)
      return
    }
  }
}

export async function getDb() {
  if (!cachedDb) {
    const { db } = await connectToDatabase()
    return db
  }
  return cachedDb
}

export async function closeDatabase() {
  if (cachedClient) {
    await cachedClient.close()
    cachedClient = null
    cachedDb = null
  }
}
