const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://insm007_db_user:8FSMNz7XdNLMqD8Y@youtube-search-cluster.wo6t609.mongodb.net/?appName=youtube-search-cluster';

async function clearCache() {
  let client;
  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db('tiktok-scout');

    console.log('🗑️ video_cache 컬렉션 삭제 중...');
    const result = await db.collection('video_cache').deleteMany({});

    console.log(`✅ 삭제 완료: ${result.deletedCount}개 항목 제거됨`);
  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('✓ MongoDB 연결 해제');
    }
  }
}

clearCache();
