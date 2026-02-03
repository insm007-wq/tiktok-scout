import { MongoClient } from 'mongodb'

async function clearCache() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://insm007_db_user:8FSMNz7XdNLMqD8Y@youtube-search-cluster.wo6t609.mongodb.net/?appName=youtube-search-cluster'
  const client = new MongoClient(mongoUri)

  try {
    console.log('MongoDB 연결 중...')
    await client.connect()
    
    const db = client.db('tiktok-scout')
    console.log('video_cache 컬렉션 삭제 중...')
    
    const result = await db.collection('video_cache').deleteMany({})
    
    console.log(`✅ 캐시 삭제 완료: ${result.deletedCount}개 문서 제거됨`)
    
    // 확인
    const count = await db.collection('video_cache').countDocuments({})
    console.log(`📊 남은 캐시: ${count}개`)
    
  } catch (error) {
    console.error('❌ 오류:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    await client.close()
  }
}

clearCache()
