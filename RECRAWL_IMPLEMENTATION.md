# Douyin CDN URL 자동 재크롤링 시스템 구현 완료

## 📋 구현 개요

Douyin CDN URL 만료 시 자동으로 재크롤링하여 새로운 유효한 URL을 획득하는 시스템이 완전히 구현되었습니다.

## ✅ 구현된 파일 목록

### 1. **새 파일: `lib/recrawl-service.ts`** ✨
**목적:** 재크롤링 로직의 중앙 관리

**주요 함수:**
- `triggerRecrawl(query, platform, dateRange)` - 재크롤링 트리거 (중복 방지 + Rate Limiting)
- `getRecrawlStatus(jobId)` - 재크롤링 진행 상태 조회
- `clearRecrawlLock(query, platform, dateRange)` - Lock 해제 (관리용)
- `resetRateLimit(query, platform)` - Rate Limit 초기화 (관리용)

**핵심 기능:**
- ✅ 중복 방지: Redis 기반 Lock (5분 TTL)
- ✅ Rate Limiting: 시간당 3회 제한
- ✅ 자동 캐시 무효화
- ✅ BullMQ Queue 기반 비동기 처리

---

### 2. **새 파일: `lib/queue/redis-client.ts`** ✨
**목적:** 재크롤링 서비스를 위한 Redis 클라이언트 제공

**특징:**
- BullMQ의 searchQueue 연결을 재사용
- Redis SET/GET 연산 지원 (Lock, Rate Limit 저장)
- 자동 연결 관리

---

### 3. **새 파일: `app/api/recrawl/route.ts`** ✨
**목적:** 프론트엔드에서 재크롤링을 트리거하는 API 엔드포인트

**엔드포인트:**
```
POST /api/recrawl
Request: { query, platform, dateRange? }
Response: { status, jobId, message, estimatedWaitSeconds }
Status Code: 202 Accepted (비동기 처리)
```

**에러 처리:**
- 400: Missing query or platform
- 401: Not authenticated
- 429: Rate limit exceeded
- 503: Feature disabled

---

### 4. **수정: `app/api/download-video/route.ts`**
**라인 85-103:** 403 Forbidden 에러 처리 추가

```typescript
if (videoResponse.status === 403) {
  console.warn('[Download] 403 Forbidden detected - CDN URL expired');
  return NextResponse.json({
    error: '영상 URL이 만료되었습니다',
    needsRecrawl: true,
    message: '프론트엔드에서 재크롤링을 트리거하세요',
  }, { status: 403 });
}
```

**변경 사항:**
- 403 에러를 특별하게 처리하여 `needsRecrawl: true` 플래그 반환
- 프론트엔드가 자동 재크롤링을 트리거할 수 있도록 함

---

### 5. **수정: `app/api/extract-subtitles/route.ts`**
**라인 87-105:** 403 Forbidden 에러 처리 추가

**동일한 처리:**
- 403 에러 시 `needsRecrawl: true` 플래그 반환

---

### 6. **수정: `app/dashboard/search.tsx`**

#### A. `handleRecrawl()` 함수 추가 (라인 871-943)
**목적:** 재크롤링 트리거 및 완료 대기

```typescript
const handleRecrawl = async (
  query: string,
  platform: Platform,
  dateRange: string
): Promise<boolean>
```

**프로세스:**
1. `/api/recrawl` POST 요청
2. Job 상태 폴링 (2초 간격, 최대 60초)
3. 완료/실패 상태 처리
4. Toast 알림으로 진행 상황 표시

#### B. `handleDownloadVideo()` 함수 수정 (라인 956-1037)
**변경 사항:**
- 403 에러 감지 시 자동 재크롤링 트리거
- 재크롤링 성공 후 다운로드 자동 재시도 (재귀 호출)
- Toast 알림으로 사용자에게 진행 상황 전달

```typescript
if (response.status === 403) {
  if (errorData.needsRecrawl) {
    addToast("info", "영상 URL이 만료되었습니다. 자동으로 새 데이터를 가져옵니다.", "🔄 재크롤링", 4000);
    const success = await handleRecrawl(searchInput, platform, filters.uploadPeriod);
    if (success) {
      return handleDownloadVideo(video); // 재귀 호출
    }
  }
}
```

#### C. `handleExtractSubtitles()` 함수 수정 (라인 1054-1132)
**동일한 처리:**
- 403 에러 시 자동 재크롤링
- 성공 후 자막 추출 재시도

---

### 7. **수정: `lib/queue/search-queue.ts`**
**라인 16-21:** SearchJobData 인터페이스 확장

```typescript
export interface SearchJobData {
  query: string
  platform: 'tiktok' | 'douyin' | 'xiaohongshu'
  dateRange?: string
  isRecrawl?: boolean  // Flag indicating this is a recrawl
}
```

---

### 8. **수정: `.env.example`**
**추가된 환경 변수:**

```env
# ====== 자동 재크롤링 설정 (CDN URL 만료 시) ======
RECRAWL_ENABLE_AUTO=true                   # 자동 재크롤링 활성화/비활성화
RECRAWL_RATE_LIMIT_PER_HOUR=3              # 시간당 최대 재크롤링 횟수
RECRAWL_MAX_ATTEMPTS=3                     # 재크롤링 최대 시도 횟수
```

---

## 🔄 동작 흐름

### 정상 시나리오
```
1. 사용자 "냉장고" 검색
2. 다운로드 버튼 클릭
3. CDN URL 유효 → 즉시 다운로드
4. 재크롤링 없음
```

### 자동 재크롤링 시나리오
```
1. 사용자 "프라이팬" 검색 (만료된 CDN URL)
2. 다운로드 버튼 클릭
3. 403 Forbidden 에러 발생
4. 프론트엔드: `/api/download-video` 응답에서 needsRecrawl=true 감지
5. 프론트엔드: `/api/recrawl` 호출 (202 Accepted 응답, jobId 반환)
6. 프론트엔드: Toast "새로운 영상 데이터를 가져오는 중... ⏳"
7. 프론트엔드: `/api/search/{jobId}` 폴링 시작 (2초 간격)
8. 백엔드: 재크롤링 실행 (Railway/Apify 스크래퍼)
9. 백엔드: 새로운 CDN URL 획득
10. 백엔드: 캐시에 저장
11. 프론트엔드: completed 상태 수신
12. 프론트엔드: Toast "새로운 데이터를 가져왔습니다! ✅"
13. 프론트엔드: 자동으로 다운로드 재시도
14. 최종: Toast "다운로드 완료"
```

### Rate Limit 시나리오
```
1. 동일 검색어로 3회 재크롤링 성공
2. 4번째 재크롤링 시도
3. /api/recrawl 응답: 429 Too Many Requests
4. 프론트엔드: Toast "시간당 재크롤링 한도 초과 (3회)"
5. 1시간 후 다시 가능
```

### 중복 방지 시나리오
```
1. 사용자 "프라이팬" 검색 → 다운로드 시도 (재크롤링 시작)
2. 동시에 다른 비디오 다운로드 시도
3. 두 번째 요청: 이미 진행 중인 Job ID 반환 (alreadyInProgress=true)
4. 중복 API 호출 없음
```

---

## 🛡️ 보안 및 비용 관리

### Rate Limiting
| 제한 | 값 | 목적 |
|------|-----|------|
| 시간당 재크롤링 | 3회 | 동일 검색어 반복 방지 |
| 동시 재크롤링 | 1개 (중복 방지) | 중복 API 호출 방지 |
| 재시도 간격 | 5분 | CDN 캐시 갱신 대기 |

### 예상 비용 증가
- **기본 가정:** 100개 검색/일, 10% CDN 만료율
- **추가 Apify 호출:** 10회/일 (10%)
- **월 비용 증가:** 약 $6 (3% 증가)
- **ROI:** UX 크게 개선, 사용자 이탈 방지

---

## 📊 모니터링 지표

배포 후 다음을 모니터링하세요:

1. **403 에러 발생률** (플랫폼별, 검색어별)
2. **재크롤링 성공률** (몇 개 검색이 재크롤링 필요?)
3. **평균 재크롤링 소요 시간** (30초 내 완료 비율)
4. **Rate Limit 트리거 빈도** (악용 감지)
5. **Apify API 호출 증가량** (비용 추적)
6. **사용자 이탈률 변화** (재크롤링 전후)

---

## 🧪 테스트 시나리오

### 테스트 1: 정상 작동
```
1. "냉장고" 검색 (유효한 CDN URL)
2. 다운로드 버튼 클릭
3. ✅ 즉시 다운로드 성공 (재크롤링 없음)
```

### 테스트 2: 자동 재크롤링
```
1. 필터를 사용하여 "프라이팬" 검색
2. 다운로드 또는 자막 추출 클릭
3. ✅ 403 에러 감지
4. ✅ Toast: "새로운 영상 데이터를 가져오는 중..."
5. ✅ 30초 내 재크롤링 완료
6. ✅ 자동 재시도 성공
7. ✅ Toast: "다운로드 완료"
```

### 테스트 3: Rate Limit
```
1. 동일 검색어로 "프라이팬" 재크롤링 3회 실행
2. 4번째 시도
3. ✅ 429 에러 응답
4. ✅ Toast: "시간당 재크롤링 한도 초과"
5. ✅ 1시간 후 리셋
```

### 테스트 4: 중복 방지
```
1. "프라이팬" 검색 후 다운로드 시작 (재크롤링 시작)
2. 즉시 다른 비디오 다운로드 시도
3. ✅ 두 번째 요청이 첫 번째 Job ID 반환
4. ✅ 중복 API 호출 없음
```

---

## 🚀 배포 체크리스트

### 환경 설정
- [ ] `.env` 파일에 `RECRAWL_ENABLE_AUTO=true` 설정
- [ ] `RECRAWL_RATE_LIMIT_PER_HOUR=3` 설정
- [ ] Redis 연결 정상 확인

### 코드 검증
- [ ] TypeScript 컴파일 에러 없음 (`npx tsc --noEmit`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 로컬 테스트 완료

### 배포
- [ ] 모든 파일 커밋
- [ ] 메인 브랜치에 PR 생성
- [ ] 코드 리뷰 완료
- [ ] 스테이징 환경 테스트
- [ ] 프로덕션 배포

### 모니터링
- [ ] 에러 로그 모니터링 (403, 429, 50x)
- [ ] Apify API 비용 추적
- [ ] 사용자 피드백 수집
- [ ] 성능 지표 분석

---

## 📝 주요 설계 결정

### 1. **왜 프론트엔드에서 트리거하는가?**
- 프론트엔드가 검색 메타데이터 (query, dateRange)를 알고 있음
- download-video API에 이 정보를 추가할 필요가 없음
- UX 측면에서 명확한 피드백 제공 가능

### 2. **왜 202 Accepted를 사용하는가?**
- 비동기 처리 명시
- HTTP 스탠다드: 202는 요청이 accepted됨을 의미
- 클라이언트가 jobId로 폴링하여 상태를 추적

### 3. **왜 5분 Lock TTL인가?**
- Apify 스크래핑 타임아웃: 2분
- 백엔드 처리 오버헤드: ~1분
- 안전 마진: 2분
- 총 5분

### 4. **왜 시간당 3회 제한인가?**
- 같은 검색어로 3회 이상 재크롤링하는 경우는 드물어야 함
- 시간당 3회 = 일일 72회 (충분한 쿼터)
- 악용 방지하면서도 합리적인 제한

### 5. **왜 2초 폴링 간격인가?**
- 너무 자주 (500ms): 서버 부하 증가
- 너무 드물게 (5초): UX 응답성 저하
- 2초: 좋은 균형

---

## 🔧 향후 개선 사항 (Optional)

1. **WebSocket 기반 실시간 업데이트** (폴링 대신)
2. **재크롤링 실패 시 알림 시스템**
3. **재크롤링 이력 추적 (분석용)**
4. **관리자 대시보드: 재크롤링 통계**
5. **사용자별 Rate Limit 맞춤 설정**
6. **메일 알림: "자주 만료되는 검색어" 통지**

---

## 📞 트러블슈팅

### 문제: 재크롤링이 트리거되지 않음
**확인 사항:**
1. `RECRAWL_ENABLE_AUTO=true` 설정 확인
2. Redis 연결 확인 (`redis-cli ping`)
3. 로그 확인: `[Recrawl] Trigger request` 메시지 존재?
4. 403 에러가 실제로 발생하는지 확인 (개발자 도구 Network)

### 문제: Rate Limit이 너무 엄격함
**해결책:**
1. `.env`에서 `RECRAWL_RATE_LIMIT_PER_HOUR=10` 증가
2. `lib/recrawl-service.ts` 라인 62의 limit 수정
3. 재배포

### 문제: 재크롤링 중 타임아웃
**확인 사항:**
1. Railway 스크래퍼가 정상 작동하는가?
2. Apify API 할당량이 있는가?
3. 네트워크 연결이 정상인가?
4. 로그에서 실제 에러 메시지 확인

---

## 🎉 완료!

자동 재크롤링 시스템이 완전히 구현되었습니다.

**다음 단계:**
1. 로컬에서 테스트하기
2. 커밋 및 PR 생성
3. 코드 리뷰
4. 스테이징 환경 배포
5. 프로덕션 배포
6. 모니터링 시작

**핵심 이점:**
- ✅ 사용자가 아무것도 하지 않아도 자동 복구
- ✅ 403 에러로 인한 이탈 방지
- ✅ 명확한 UX 피드백 (Toast 알림)
- ✅ 비용 효율적 (Rate Limiting)
- ✅ 안정적 (중복 방지, 에러 처리)
