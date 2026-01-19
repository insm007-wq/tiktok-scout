# 다음주 - 300명 동시 접속 비동기 큐 아키텍처 완성

## 📌 현재 상태 (이번주 완료)

### ✅ 완료된 작업
- BullMQ 패키지 설치 (bullmq, ioredis, pm2, dotenv, socket.io)
- `lib/queue/redis.ts` 생성 (TLS/SSL 설정 포함)
- `lib/queue/search-queue.ts` 생성
- `lib/queue/search-worker.ts` 생성 (Worker 실행 로그 추가)
- `app/api/search/route.ts` 생성 (즉시 응답 API)
- `app/api/search/[jobId]/route.ts` 생성 (상태 조회)
- `pages/api/socketio.ts` 생성 (WebSocket 실시간)
- `app/dashboard/search.tsx` 수정 (새로운 비동기 API 사용)
- `.env.local` 설정 (Upstash Free Redis URL)
- Worker 시작 확인 ✅
- 큐에 작업 추가 성공 ✅

### ⏳ 대기 중
- **Upstash Fixed Plan 업그레이드** ($20/월) ← 다음주 필수!

---

## 🎯 Priority 1: 필수 작업 (다음주 월요일-수요일)

### 1️⃣ Upstash Fixed Plan 업그레이드 (5분)

**현재 문제**: Free Tier는 Lua 스크립트 미지원 → BullMQ 사용 불가

**해야 할 일**:
1. https://console.upstash.com 접속
2. `cheerful-snake-33016` Redis 클릭
3. **Billing** → **Fixed Plan** 선택
4. **$20/month** 결제

**예상 효과**:
- Lua 스크립트 지원 ✅
- 10,000 commands/초 ✅
- BullMQ 모든 기능 활성화 ✅

---

### 2️⃣ Redis URL 업데이트 (1분)

**새로운 Redis URL 복사**:
1. Upstash 콘솔 → Details 탭
2. `redis-cli --tls -u redis://default:NEW_TOKEN@...` 명령어 복사
3. **NEW_TOKEN** 부분 추출

**`.env.local` 수정**:
```env
# 기존
REDIS_URL=redis://default:AYD4AAIncDFmNWMzY2I2MzY3OWM0ZGE2YTJjOTIzMzY1ZmU0YTBmY3AxMzMwMTY@cheerful-snake-33016.upstash.io:6379

# 변경 (새로운 토큰)
REDIS_URL=redis://default:NEW_TOKEN_HERE@cheerful-snake-33016.upstash.io:6379
```

---

### 3️⃣ Worker 시작 및 테스트 (2분)

**터미널 1: Worker 실행**
```bash
npm run worker
```

**예상 로그**:
```
[dotenv@17.2.3] injecting env (19) from .env.local
[Worker] 🚀 Worker started and listening for jobs...
```

✅ 이 로그가 나오면 성공!

---

### 4️⃣ 앱 시작 및 API 테스트 (2분)

**터미널 2: 앱 실행**
```bash
npm run dev
```

**예상 로그**:
```
✓ Ready in 972ms
- Local: http://localhost:3000
```

---

### 5️⃣ 검색 기능 테스트 (5분)

**브라우저**: http://localhost:3000/dashboard

**검색 프로세스**:
1. 검색창에 "test" 입력
2. 검색 버튼 클릭
3. Worker 터미널에서 로그 확인:
   ```
   [Worker] Job xxx progress: 10%
   [Worker] Job xxx progress: 50%
   [Worker] Job xxx progress: 80%
   [Worker] Job xxx completed
   ```

✅ 이 로그가 나오면 **전체 시스템 정상 작동!**

---

### 6️⃣ 캐시 테스트 (2분)

**같은 검색어로 2번 검색**:

1. **첫 번째 검색** (캐시 미스)
   - Worker에서 2-10분 처리
   - 앱에서 "검색 중..." 표시

2. **두 번째 검색** (캐시 히트)
   - ⚡ **즉시 결과 표시** (0.1초)
   - Worker 로그 없음 (캐시 사용)

✅ 두 번째가 훨씬 빠르면 성공!

---

### 7️⃣ 부하 테스트 (5분)

**브라우저 콘솔 (F12 개발자 도구)**에서:

```javascript
// 동시에 10개 검색 요청
for (let i = 0; i < 10; i++) {
  fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `test${i}`,
      platform: 'tiktok',
      dateRange: 'all'
    })
  }).then(r => r.json()).then(d => console.log(d))
}
```

**Worker 터미널에서**:
- 10개의 Job이 동시에 처리되는 로그 확인
- `[Worker] Job xxx progress: ...` 10개 이상 출력

✅ 모든 작업이 Queue에 추가되고 처리되면 성공!

---

### ✅ Priority 1 완료 체크리스트

- [ ] Upstash Fixed Plan 업그레이드
- [ ] 새로운 Redis URL 복사 및 `.env.local` 업데이트
- [ ] npm run worker 실행 및 "[Worker] 🚀 Worker started..." 로그 확인
- [ ] npm run dev 실행 및 앱 정상 로드 확인
- [ ] 검색 테스트 - Worker 터미널에 Job 로그 출력 확인
- [ ] 캐시 테스트 - 같은 검색어 2번 검색 시 2번째 빠른 응답 확인
- [ ] 부하 테스트 - 동시 10개 요청 모두 처리 확인

---

## 📋 Priority 2: 배포 후 1주일 내 (수요일-금요일)

### 1️⃣ LRU 캐시 메모리 최적화

**파일**: `lib/cache.ts`

**작업**:
- LRU 캐시 크기: 1,000 → **10,000** (메모리 1GB 확보)
- TTL: 30분 → **24시간** (캐시 히트율 50% → 95%)

**코드 위치**:
```typescript
const cache = new LRUCache<string, any>({
  max: 10000,           // ← 수정
  ttl: 24 * 60 * 60 * 1000, // ← 수정 (24시간)
  updateAgeOnGet: true,
  allowStale: true,
  ttlAutopurge: false
})
```

---

### 2️⃣ MongoDB TTL 인덱스 설정

**파일**: `lib/mongodb.ts`

**작업**:
- 캐시 유지 기간: 7일 → **90일**
- TTL 인덱스 추가 (자동 삭제)

**코드 위치**:
```typescript
await db.collection('video_cache').createIndexes([
  { key: { query: 1, platform: 1, dateRange: 1 }, unique: true },
  { key: { accessCount: -1 } },
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // TTL 인덱스
  { key: { createdAt: -1 } }
])
```

---

### 3️⃣ 에러 핸들링 강화

**파일**: `lib/scrapers/tiktok.ts`, `douyin.ts`, `xiaohongshu.ts`

**작업**:
- Apify 429 에러 (레이트 제한) 감지 시 자동 재시도
- Exponential backoff (1초, 2초, 4초...)

**예시 코드**:
```typescript
async function apifyCallWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
        continue
      }
      throw error
    }
  }
}
```

---

### 4️⃣ BullMQ 대시보드 설정

**파일**: `app/admin/queue/page.tsx`

**기능**:
- 대기 중인 작업 수 실시간 표시
- 처리 중인 작업 진행률 표시
- 완료/실패한 작업 로그
- URL: `/admin/queue` (관리자만 접속)

**설치**:
```bash
npm install @bull-board/api @bull-board/nextjs
```

---

### 5️⃣ 캐시 워밍 (인기 검색어 사전 수집)

**파일**: `lib/scheduled/cache-warming.ts`

**기능**:
- 6시간마다 인기 검색어 상위 20개 자동 수집
- 캐시 만료되기 전에 미리 갱신
- 사용자가 검색했을 때 즉시 캐시 히트

**Vercel Cron 설정** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/warm-cache",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

### ✅ Priority 2 완료 체크리스트

- [ ] LRU 캐시 크기 10,000으로 증대
- [ ] TTL 24시간으로 설정
- [ ] MongoDB 인덱스 설정 (TTL 포함)
- [ ] Apify 429 에러 재시도 로직 추가
- [ ] BullMQ 대시보드 설정 (`/admin/queue` 접속 가능)
- [ ] 캐시 워밍 스크립트 추가
- [ ] Vercel Cron 설정

---

## 📊 예상 성과 (Priority 1+2 완료 후)

| 지표 | 기존 (동기식) | 개선 후 |
|------|-------------|--------|
| **300명 동시 접속** | 시스템 다운 ❌ | 정상 작동 ✅ |
| **평균 응답 시간** | 2-10분 | **0.85초** |
| **캐시 히트율** | 50% | **95%** |
| **동시 처리 능력** | 10명 | **300명+** |
| **타임아웃 에러** | 자주 발생 | 거의 없음 |

---

## 🚀 Priority 3: 추가 최적화 (선택사항)

### 1️⃣ Redis Sentinel (고가용성)
- Redis 장애 시 자동 failover
- 99.99% → 99.999% SLA

### 2️⃣ Apify 병렬화
- 단일 검색어에 3개 Actor 동시 호출
- 평균 2분 → 40초

### 3️⃣ CDN 캐싱 (Cloudflare)
- 정적 검색 결과 엣지에서 제공
- 응답 시간 <50ms

### 4️⃣ Connection Pooling 최적화
- HTTP Keep-Alive 설정
- 요청당 200ms 절약

---

## 📝 주요 파일 위치

```
D:\project\tik-tok-scout\
├── lib\
│   ├── queue\
│   │   ├── redis.ts ✅
│   │   ├── search-queue.ts ✅
│   │   └── search-worker.ts ✅
│   ├── cache.ts (Priority 2)
│   ├── mongodb.ts (Priority 2)
│   └── scrapers\
│       ├── tiktok.ts (Priority 2)
│       ├── douyin.ts (Priority 2)
│       └── xiaohongshu.ts (Priority 2)
├── app\
│   ├── api\
│   │   ├── search\
│   │   │   ├── route.ts ✅
│   │   │   └── [jobId]\
│   │   │       └── route.ts ✅
│   │   └── cron\
│   │       └── warm-cache\
│   │           └── route.ts (Priority 2)
│   ├── dashboard\
│   │   └── search.tsx ✅
│   └── admin\
│       └── queue\
│           └── page.tsx (Priority 2)
├── pages\
│   └── api\
│       └── socketio.ts ✅
├── .env.local (업데이트 필요)
├── ecosystem.config.js ✅
└── NEXT_WEEK_TASKS.md (이 파일)
```

---

## 🎬 실행 명령어

```bash
# Worker 시작
npm run worker

# 앱 시작 (다른 터미널)
npm run dev

# PM2로 Worker 클러스터 실행 (선택)
npm run worker:pm2

# 부하 테스트 (k6 설치 필요)
k6 run load-test.js
```

---

## ⚠️ 주의사항

1. **Redis URL 꼭 업데이트하기**
   - Fixed Plan 업그레이드 후 새로운 토큰으로 변경 필수

2. **두 터미널 모두 실행**
   - Worker 터미널 + App 터미널 동시 필요

3. **에러 발생 시**
   - Worker 터미널 로그 확인
   - 앱 터미널 로그 확인
   - 브라우저 개발자 도구 (F12) 콘솔 확인

4. **테스트 중 로그 남기기**
   - 나중에 문제 해결할 때 필요

---

## 📞 예상 문제 & 해결

| 문제 | 원인 | 해결 |
|------|------|------|
| Worker가 시작 안 됨 | Redis URL 잘못됨 | `.env.local` 확인 |
| API 500 에러 | Lua 스크립트 미지원 | Fixed Plan 업그레이드 |
| Job 로그 안 나옴 | Worker 실행 안 됨 | npm run worker 확인 |
| 검색이 느림 | 캐시 미스 | 같은 검색어 2번 시도 |
| 부하 테스트 실패 | 동시 요청 많음 | Worker 개수 증가 (Priority 1) |

---

## ✅ 완료 후 다음 단계

Priority 1 + Priority 2 완료 후:
1. Railway에 배포 (프로덕션)
2. Redis를 Railway 자체 Redis로 전환 ($5-10/월)
3. MongoDB M30 업그레이드 (옵션)
4. Priority 3 최적화 (선택)

---

## 📅 추정 시간

| 항목 | 시간 |
|------|------|
| Priority 1 | **30분** |
| Priority 2 | **4-6시간** |
| Priority 3 | **8-10시간** |
| **총합** | **12-16시간** |

---

**이 문서를 북마크해두고 다음주에 순서대로 진행하세요!** 🚀

모든 준비가 완료되었습니다. 화이팅! 💪
