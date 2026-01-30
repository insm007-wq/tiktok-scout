# 스마트 캐싱 + On-Demand 갱신 흐름도 (R2 제거 + 비용 최적화)

**📅 업데이트**: 2026-01-30
**변경사항**: 자동 갱신 크론 제거 → On-Demand 스크래핑 + 12시간 TTL (비용 75% 절감)

---

## 전체 동작 흐름

### 일반 검색 (사용자)

```
┌─────────────┐
│ 사용자 검색  │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│  tik-tok-scout       │
│  (Next.js 프론트엔드) │
└──────────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ 캐시 확인        │
    └──────┬───────────┘
           │
       ┌───┴───────┐
       │ 캐시 HIT? │
       └───┬───────┘
           │
      ┌────┴────┐
   YES│         │NO
      │         │
      ▼         ▼
   ┌─────┐  ┌──────────────────────┐
   │CDN  │  │   검색 Queue         │
   │URL  │  │  (Redis/Background)  │
   │반환 │  └──────────┬───────────┘
   └─────┘             │
                       ▼
                ┌──────────────────────────┐
                │   Railway Worker         │
                │   (tiktok-scraper)       │
                └──────────┬───────────────┘
                           │
                           ▼
                ┌──────────────────────────┐
                │   Apify 호출             │
                │   - TikTok/Douyin 스크래핑
                └──────────┬───────────────┘
                           │
                           ▼
                ┌──────────────────────────┐
                │   CDN URL 수신           │
                │   (thumbnail, videoUrl)  │
                └──────────┬───────────────┘
                           │
                           ▼
                ┌──────────────────────────┐
                │   MongoDB 캐시 저장       │
                │   - searchCount: 0       │
                │   - TTL: 24시간          │
                │   - CDN URL 저장         │
                └──────────┬───────────────┘
                           │
                           ▼
                ┌──────────────────────────┐
                │   프론트엔드             │
                │   CDN URL 반환           │
                └──────────────────────────┘
```

### On-Demand 갱신 (캐시 만료 후)

```
   12시간 경과
      │
      ▼
┌─────────────────┐
│ 캐시 TTL 만료   │
│(expiresAt < now)│
└────────┬────────┘
         │
         ▼
   사용자 재검색
      │
      ▼
┌─────────────────┐
│ 캐시 미스 감지  │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ BullMQ Queue에 추가  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Railway Worker       │
│ 처리 (30-60초)       │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ 새 CDN URL 수신      │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ MongoDB 캐시 갱신    │
│ - 새 CDN URL        │
│ - expiresAt: +12h   │
└──────────────────────┘
```

---

## 상세 흐름

### 1️⃣ 사용자 검색

```
사용자: "프라이팬" 검색
  ↓
캐시 확인 (L1 메모리 → L2 MongoDB)
  ↓
캐시 미스: BullMQ Queue에 추가
  ↓
searchCount 초기화: 0
```

### 2️⃣ 캐시 조회 (2회차 이상)

```
캐시 히트 (MongoDB)
  ↓
searchCount 증가: 0 → 1, 1 → 2, ... → 5
  ↓
5회 도달하면 인기 검색어 판정 ⭐
  ↓
CDN URL 반환 (24시간 TTL 동안 유효)
```

### 3️⃣ On-Demand 갱신 (캐시 미스)

```
[Vercel Cron ❌ 제거 - 비용 절감]

사용자 재검색
  ↓
캐시 TTL 만료 확인 (12시간 경과)
  ↓
캐시 미스 감지
  ↓
BullMQ Queue에 추가
  ↓
Railway Worker가 처리:
  - Apify 호출
  - 새로운 CDN URL 수신 (30-60초 대기)
  ↓
MongoDB 갱신:
  - CDN URL 업데이트
  - expiresAt: +12시간
  - searchCount 증가
  ↓
사용자에게 반환 (새 CDN URL) ✅
```

### 4️⃣ 캐시 만료 후 처리

```
캐시 TTL: 12시간 경과
  ↓
캐시 만료 자동 삭제 (MongoDB TTL)
  ↓
다음 사용자 검색 시:
  ↓
캐시 미스 → 새로 스크래핑 (30-60초)
  ↓
새 CDN URL로 캐시 갱신 (+12시간)
  ↓
이후 사용자: 캐시 히트 (즉시) ✅
```

---

## 스키마 변경사항

### VideoCacheDocument (MongoDB)

```typescript
interface VideoCacheDocument {
  query: string;
  platform: Platform;
  videos: VideoResult[];

  // 모니터링 필드
  searchCount: number; // 누적 검색 횟수 (인기도)
  accessCount: number; // 전체 조회 횟수

  // 만료 관리
  expiresAt: Date; // TTL: 12시간 (before: 24시간)
  createdAt: Date;
  lastAccessedAt: Date;
}
```

### MongoDB 인덱스

```typescript
// 인기 검색어 정렬용 (신규)
createIndex({ searchCount: -1 });

// 기존 인덱스
createIndex({ expiresAt: 1 }); // TTL 자동 삭제
createIndex({ cacheKey: 1 }); // 조회 최적화
```

---

## 환경 변수

### 제거됨 (R2 관련)

```env
❌ R2_ENDPOINT
❌ R2_ACCESS_KEY_ID
❌ R2_SECRET_ACCESS_KEY
❌ R2_BUCKET_NAME
❌ R2_PUBLIC_DOMAIN
```

### 필요 (크론 설정 및 수동 테스트)

```env
✅ CRON_SECRET          # Vercel Cron 인증 (warm-cache 용)
✅ ADMIN_SECRET         # 수동 갱신 테스트
```

**주의**: `refresh-popular` 자동 갱신이 제거되었으므로, CRON_SECRET은 이제 `warm-cache`만 사용합니다.

---

## 핵심 개선사항 (Phase 2: 비용 최적화)

| 항목                 | Phase 1 (전) | Phase 2 (현재) | 개선           |
| -------------------- | ------------ | -------------- | -------------- |
| **자동 갱신**        | 12시간마다  | ❌ 제거 (필요시만) | ✅ 비용 75% 절감 |
| **TTL**              | 24시간       | 12시간         | ✅ CDN 유효성 보장 |
| **Apify 크레딧/월**  | 400K         | 100K           | ✅ -300K (-75%) |
| **월간 추가 비용**   | +$30         | $0             | ✅ -$30        |
| **사용 패턴**        | 예측기반     | 수요기반       | ✅ 효율화      |
| **사용자 경험**      | 즉시 (캐시)  | 30-60초 대기   | ⏱️ 트레이드오프 |

**결론**: 30-60초 대기는 사용자가 수용 가능하며, **월 $30 절감** 효과

---

## 파일 변경사항 (Phase 2)

### 수정됨

```
✏️ vercel.json
   - ❌ refresh-popular 크론 제거
   - ✅ warm-cache 크론만 유지

✏️ lib/cache.ts
   - TTL: 24시간 → 12시간 (0.5일 = 12시간)
   - setVideoToMongoDB() 기본값: ttlDays: 1 → 0.5
   - setVideoToCache() MongoDB 저장: 90일 → 0.5일

✏️ app/api/cron/refresh-popular/route.ts
   - 문서 업데이트: "Automatic Cron Disabled"
   - GET: 더 이상 Vercel Cron에서 호출 안 함
   - POST: 수동 테스트용으로만 유지
```

### 유지됨 (기존 R2 제거)

```
✅ app/api/cron/warm-cache/route.ts
   - 6시간마다 top 20 쿼리 사전 캐시 (선택사항)

✅ lib/cache.ts getPopularQueries()
   - searchCount 기반 인기 검색어 조회

✅ lib/mongodb.ts
   - searchCount 인덱스 (이미 추가됨)

✅ lib/scrapers/douyin.ts, tiktok.ts, xiaohongshu.ts
   - CDN URL 직접 사용 (R2 제거 완료)
```

---

## API 엔드포인트

### POST /api/cron/refresh-popular (수동 테스트 전용)

**주의**: 자동 갱신이 제거되었습니다. 수동으로만 호출할 수 있습니다.

```bash
curl -X POST https://yourdomain.com/api/cron/refresh-popular \
  -H "Authorization: Bearer ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "minSearchCount": 5,
    "limit": 50
  }'
```

**응답**:
```json
{
  "success": true,
  "queriesFound": 50,
  "queriesQueued": 50,
  "duration": "2500ms",
  "timestamp": "2026-01-30T12:00:00Z"
}
```

### GET /api/cron/warm-cache (여전히 자동 실행)

**상태**: ✅ 여전히 활성화 (6시간마다)
- 목적: 인기 검색어 상위 20개 사전 캐시
- 자동 스크래핑 아님, 기존 데이터 갱신만

---

## Vercel Cron 설정 (Phase 2 - 비용 최적화)

**vercel.json** (업데이트됨)

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

**변경사항**:
- ❌ `refresh-popular` (12시간마다) 제거
- ✅ `warm-cache` (6시간마다) 유지

---

## 사용자 경험 (Phase 2)

### 첫 검색

```
[0초] 사용자: "프라이팬" 검색
  ↓
[~30초] 스크래핑 중...
  ↓
[~60초] ✅ 결과 반환 + 캐시 저장
```

### 12시간 이내 재검색

```
[0초] 사용자: "프라이팬" 검색
  ↓
[즉시] ✅ 캐시 히트 (CDN URL 유효)
```

### 12시간 후 재검색

```
[0초] 사용자: "프라이팬" 검색
  ↓
[~30초] 캐시 만료 감지 → 재스크래핑 (사용자가 기다림)
  ↓
[~60초] ✅ 새로운 CDN URL 반환
```

**요약**:
- 12시간 내: 즉시 결과 ✅
- 12시간 후: 30-60초 대기 (평상시 이용 시간대는 캐시 히트 높음)

---

## 마이그레이션 완료 ✅ (Phase 1 + Phase 2)

### Phase 1: R2 제거 (완료)
- ✅ R2 완전 제거
- ✅ CDN URL 직접 사용
- ✅ 스마트 캐싱 시스템

### Phase 2: 비용 최적화 (2026-01-30 완료)
- ✅ 자동 갱신 크론 제거 (refresh-popular)
- ✅ TTL: 24시간 → 12시간 변경
- ✅ On-Demand 스크래핑 전환
- ✅ 비용 75% 절감 (400K → 100K Apify 크레딧/월)

**상태**: 배포 준비 완료 🚀

---

## 비용 분석

| 항목 | 예상 비용/월 | 절감율 |
|------|------------|--------|
| Phase 1 (R2 제거 후) | 400K + $30 | -$25 (R2) |
| Phase 2 (자동 갱신 제거) | 100K + $0 | -300K (-75%) |

**결론**: 매월 ~$30 절감 + 300K Apify 크레딧 절감
