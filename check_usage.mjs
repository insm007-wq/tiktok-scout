import { MongoClient } from "mongodb";

const MONGODB_URI = "mongodb+srv://insm007_db_user:8FSMNz7XdNLMqD8Y@youtube-search-cluster.wo6t609.mongodb.net/?appName=youtube-search-cluster";

async function checkUsage() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db("tiktok-scout");
    
    console.log("\n=== 📊 TikTok Scout 사용 현황 분석 ===\n");
    
    // 1. 사용자 통계
    console.log("1️⃣ 사용자 통계");
    const totalUsers = await db.collection("users").countDocuments();
    const activeUsers = await db.collection("users").countDocuments({ isActive: true });
    console.log(`  - 총 사용자: ${totalUsers}명`);
    console.log(`  - 활성 사용자: ${activeUsers}명`);
    
    // 2. API 사용량
    console.log("\n2️⃣ API 사용량");
    const totalApiUsage = await db.collection("api_usage").countDocuments();
    const usageByDate = await db.collection("api_usage")
      .aggregate([
        { $group: { _id: "$date", count: { $sum: "$count" } } },
        { $sort: { _id: -1 } },
        { $limit: 10 }
      ])
      .toArray();
    
    console.log(`  - 총 API 사용 기록: ${totalApiUsage}개`);
    if (usageByDate.length > 0) {
      console.log(`  - 최근 10일 사용량:`);
      usageByDate.forEach(item => {
        console.log(`    • ${item._id}: ${item.count}회`);
      });
    } else {
      console.log("  - 최근 사용 기록 없음");
    }
    
    // 3. 캐시 통계
    console.log("\n3️⃣ 캐시 통계");
    const totalCache = await db.collection("video_cache").countDocuments();
    const expiredCache = await db.collection("video_cache").countDocuments({ expiresAt: { $lt: new Date() } });
    const validCache = totalCache - expiredCache;
    console.log(`  - 전체 캐시: ${totalCache}개`);
    console.log(`  - 유효한 캐시: ${validCache}개`);
    console.log(`  - 만료된 캐시: ${expiredCache}개`);
    
    // 4. 최근 활동 (최근 30일)
    console.log("\n4️⃣ 최근 활동");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const recentActivity = await db.collection("api_usage")
      .countDocuments({ date: { $gte: thirtyDaysAgo } });
    
    if (recentActivity === 0) {
      console.log(`  - 지난 30일 활동: 없음`);
    } else {
      console.log(`  - 지난 30일 활동: ${recentActivity}개 기록`);
    }
    
    // 5. 결론
    console.log("\n5️⃣ 결론");
    if (totalApiUsage === 0) {
      console.log("  ⚠️ 시스템이 사용되고 있지 않습니다.");
    } else if (usageByDate.length === 0) {
      console.log("  ⚠️ 최근 사용 기록이 없습니다.");
    } else {
      const lastDate = usageByDate[0]._id;
      const today = new Date().toISOString().split('T')[0];
      const daysDiff = Math.floor((new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
      console.log(`  ✅ 마지막 사용: ${lastDate} (${daysDiff}일 전)`);
    }
    
  } finally {
    await client.close();
  }
}

checkUsage().catch(console.error);
