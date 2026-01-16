const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://insm007_db_user:8FSMNz7XdNLMqD8Y@youtube-search-cluster.wo6t609.mongodb.net/?appName=youtube-search-cluster';

async function checkStats() {
  let client;
  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db('tiktok-scout');

    console.log('📊 캐시 통계 조회 중...\n');

    const caches = await db.collection('video_cache')
      .find({})
      .sort({ accessCount: -1 })
      .limit(15)
      .toArray();

    if (caches.length === 0) {
      console.log('⚠️ 캐시 데이터 없음');
      return;
    }

    console.log(`총 ${caches.length}개의 캐시 항목:\n`);
    console.log('순위 | 플랫폼  | 검색어      | 조회수 | 영상수 | 마지막 조회');
    console.log('----+--------+------------+-------+-------+----------------------------------');

    caches.forEach((cache, idx) => {
      const platform = cache.platform.toUpperCase().padEnd(6);
      const query = (cache.query || '').substring(0, 10).padEnd(10);
      const access = String(cache.accessCount).padStart(4);
      const count = String(cache.videoCount).padStart(4);
      const lastAccess = cache.lastAccessedAt?.toLocaleString('ko-KR') || '없음';

      console.log(`${String(idx + 1).padStart(2).padEnd(3)}| ${platform} | ${query} | ${access} | ${count} | ${lastAccess}`);
    });

    const totalAccess = caches.reduce((sum, c) => sum + c.accessCount, 0);
    console.log(`\n📈 총 조회 횟수: ${totalAccess}회`);
  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkStats();
