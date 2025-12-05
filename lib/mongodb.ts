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

  const client = new MongoClient(mongoUri)

  try {
    await client.connect()
    const db = client.db('youtube-search')

    cachedClient = client
    cachedDb = db

    console.log('✓ Connected to MongoDB')

    // 인덱스 초기화 (최초 1회만)
    if (!indexesInitialized) {
      await initializeIndexes(db)
      indexesInitialized = true
    }

    return { client, db }
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error)
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

    console.log('✓ MongoDB 인덱스 생성 완료')
  } catch (error) {
    if ((error as any).code === 48 || (error as any).code === 68) {
      // 인덱스 이미 존재 (정상)
      return
    }
    console.warn('⚠️ MongoDB 인덱스 생성 경고:', (error as any).message)
  }
}

export async function closeDatabase() {
  if (cachedClient) {
    await cachedClient.close()
    cachedClient = null
    cachedDb = null
    console.log('✓ Disconnected from MongoDB')
  }
}
