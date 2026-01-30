const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://insm007_db_user:8FSMNz7XdNLMqD8Y@youtube-search-cluster.wo6t609.mongodb.net/?appName=youtube-search-cluster';

async function checkCollections() {
  let client;
  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db('tiktok-scout');

    console.log('📋 tiktok-scout 데이터베이스의 컬렉션 목록:\n');
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  - ${collection.name}: ${count}개 문서`);
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkCollections();
