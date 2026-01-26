import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI!;

if (!mongoUri) {
  console.error('❌ MONGODB_URI이 설정되지 않았습니다');
  process.exit(1);
}

async function clearCache() {
  const client = new MongoClient(mongoUri as string);

  try {
    console.log('🔄 MongoDB에 연결 중...');
    await client.connect();

    const db = client.db('tiktok-scout');
    const collection = db.collection('video_cache');

    console.log('📊 캐시 정보 조회 중...');
    const count = await collection.countDocuments();
    console.log(`   현재 캐시 문서 수: ${count}개`);

    if (count === 0) {
      console.log('✅ 삭제할 캐시가 없습니다');
      return;
    }

    // 플랫폼별 캐시 개수 조회
    const platforms = ['tiktok', 'douyin', 'xiaohongshu'];
    for (const platform of platforms) {
      const platformCount = await collection.countDocuments({ platform });
      if (platformCount > 0) {
        console.log(`   - ${platform}: ${platformCount}개`);
      }
    }

    console.log('\n🗑️  캐시 삭제 중...');
    const result = await collection.deleteMany({});

    console.log(`✅ 삭제 완료!`);
    console.log(`   - 삭제된 문서: ${result.deletedCount}개`);
    console.log(`   - 현재 캐시 개수: 0개`);
    console.log('\n📝 다음 검색부터 새로운 데이터가 수집됩니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

clearCache();
