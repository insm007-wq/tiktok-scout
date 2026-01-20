# 코드베이스 분석: TikTalk Killa

## 1. 프로젝트 개요

**프로젝트명**: TikTalk Killa (틱톡킬라)
**목적**: TikTok, Douyin, 샤오홍슈 영상을 통합 검색하고 분석하는 도구
**현재 상태**: 개발 진행 중 (test4 브랜치)
**배포 플랫폼**: Railway, Vercel

---

## 2. 주요 디렉토리 구조

```
D:\project\tik-tok-scout/
├── app/                          # Next.js App Router (메인 애플리케이션)
│   ├── api/                      # API 엔드포인트
│   │   ├── auth/                 # 인증 관련 API
│   │   ├── search/               # 검색 API
│   │   ├── admin/                # 관리자 API
│   │   └── cron/                 # 크론 작업
│   ├── components/               # 페이지별 컴포넌트
│   ├── dashboard/                # 대시보드 페이지
│   ├── search/                   # 검색 페이지
│   ├── auth/                     # 로그인/가입 페이지
│   ├── admin/                    # 관리자 페이지
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 홈페이지
│   └── providers.tsx             # SessionProvider 설정
│
├── lib/                          # 유틸리티 및 로직
│   ├── auth/                     # 인증 로직
│   │   └── password.ts           # 패스워드 해싱/검증
│   ├── models/                   # 데이터 모델
│   │   └── VideoCache.ts         # 캐시 모델
│   ├── queue/                    # BullMQ 작업 큐
│   │   ├── redis.ts              # Redis 연결
│   │   ├── search-queue.ts       # 검색 작업 큐 정의
│   │   └── search-worker.ts      # 검색 작업 워커 (메인 처리)
│   ├── scrapers/                 # 웹 스크래퍼
│   │   ├── tiktok.ts             # TikTok 검색
│   │   ├── douyin.ts             # Douyin 검색
│   │   └── xiaohongshu.ts        # 샤오홍슈 검색
│   ├── scheduled/                # 정기 작업
│   │   └── cache-warming.ts      # 캐시 사전 로드
│   ├── utils/                    # 유틸리티 함수
│   │   ├── fetch-with-retry.ts   # 재시도 로직이 있는 fetch
│   │   └── xiaohongshuTimeParser.ts
│   ├── validations/              # 입력 검증
│   │   └── auth.ts               # 인증 입력 검증
│   ├── mongodb.ts                # MongoDB 연결 및 인덱스 초기화
│   ├── cache.ts                  # 계층형 캐시 (L1 메모리 + L2 MongoDB)
│   ├── auth.ts                   # NextAuth 설정
│   ├── userLimits.ts             # 사용자 할당량 관리
│   ├── apiUsage.ts               # API 사용량 추적
│   ├── dateUtils.ts              # 날짜 유틸리티
│   ├── durationUtils.ts          # 길이 유틸리티
│   ├── engagementUtils.ts        # 참여율 계산
│   └── formatters.ts             # 데이터 포맷팅
│
├── components/                   # 공유 컴포넌트
│   └── SearchProgress.tsx
│
├── pages/api/                    # Legacy Pages Router API
│   └── socketio.ts               # Socket.IO 연결
│
├── types/                        # TypeScript 타입 정의
│   ├── video.ts                  # 영상 결과 타입
│   └── index.ts
│
├── public/                       # 정적 파일
├── scripts/                      # 빌드/배포 스크립트
│
├── package.json                  # 의존성 관리
├── tsconfig.json                 # TypeScript 설정
├── next.config.ts                # Next.js 설정
├── tailwind.config.ts            # Tailwind CSS 설정
├── ecosystem.config.js           # PM2 설정 (워커 관리)
├── docker-compose.local.yml      # Redis Docker 설정
└── .env.local                    # 환경 변수
```

---

## 3. 기술 스택

### 프론트엔드
- **프레임워크**: Next.js 16.0.7 (App Router)
- **UI 라이브러리**: React 19.2.0
- **스타일링**: Tailwind CSS 4
- **폼 관리**: React Hook Form 7.71.0
- **아이콘**: Lucide React 0.553.0
- **애니메이션**: Framer Motion 12.23.24
- **상태 관리**: SWR 2.2.0 (데이터 페칭)

### 백엔드
- **런타임**: Node.js + TypeScript 5.9.3
- **프레임워크**: Next.js API Routes
- **인증**: NextAuth v5 (beta)
- **비밀번호**: bcryptjs 3.0.3, JWT Simple 0.5.6

### 데이터베이스
- **주 데이터베이스**: MongoDB 6.10.0
- **캐시 (L1)**: LRU Cache (메모리)
- **캐시 (L2)**: MongoDB
- **작업 큐**: BullMQ 5.66.5
- **메시지 브로커**: Redis (BullMQ용)

### 작업 관리
- **프로세스 매니저**: PM2 6.0.14
- **작업 큐**: BullMQ (Redis 기반)
- **모니터링**: Bull Board (BullMQ UI)

### 개발/배포
- **린팅**: ESLint 9
- **환경 변수**: dotenv 17.2.3
- **실시간 통신**: Socket.IO 4.8.3
- **Docker**: Docker Compose (Redis 로컬 개발용)

---

## 4. 사용된 주요 파일과 목적

### 인증 & 사용자 관리
| 파일 | 목적 |
|------|------|
| `lib/auth.ts` | NextAuth 설정 (자격증명 기반 인증, JWT, 세션 관리) |
| `lib/auth/password.ts` | 비밀번호 해싱 및 검증 |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth 핸들러 |
| `lib/userLimits.ts` | 사용자 조회 및 할당량 관리 |

### API 엔드포인트
| 파일 | 목적 |
|------|------|
| `app/api/search/route.ts` | 검색 요청 처리 (큐에 작업 추가) |
| `app/api/search/[jobId]/route.ts` | 검색 작업 상태 조회 |
| `app/api/auth/signup/route.ts` | 회원가입 처리 |
| `app/api/admin/queue-stats/route.ts` | 큐 통계 조회 |
| `app/api/cron/warm-cache/route.ts` | 캐시 사전 로드 |

### 데이터 처리
| 파일 | 목적 |
|------|------|
| `lib/mongodb.ts` | MongoDB 연결 및 인덱스 초기화 |
| `lib/cache.ts` | 계층형 캐시 (L1 메모리 + L2 MongoDB) |
| `lib/models/VideoCache.ts` | 캐시 문서 모델 |
| `lib/apiUsage.ts` | API 사용량 추적 |

### 웹 스크래핑
| 파일 | 목적 |
|------|------|
| `lib/scrapers/tiktok.ts` | TikTok 검색 (Apify API) |
| `lib/scrapers/douyin.ts` | Douyin 검색 (Apify API) |
| `lib/scrapers/xiaohongshu.ts` | 샤오홍슈 검색 (Apify API) |

### 작업 큐 & 워커
| 파일 | 목적 |
|------|------|
| `lib/queue/redis.ts` | Redis 연결 설정 |
| `lib/queue/search-queue.ts` | BullMQ 검색 큐 정의 |
| `lib/queue/search-worker.ts` | 검색 작업 워커 (실제 스크래핑 처리) |

### 페이지
| 파일 | 목적 |
|------|------|
| `app/page.tsx` | 홈페이지 (메타데이터, SEO) |
| `app/home-content.tsx` | 홈페이지 UI (플랫폼 카드, 호출) |
| `app/search/page.tsx` | 검색 페이지 (검색 폼, 결과 표시) |
| `app/auth/login/page.tsx` | 로그인 페이지 |
| `app/auth/signup/page.tsx` | 회원가입 페이지 |
| `app/dashboard/page.tsx` | 사용자 대시보드 |

---

## 5. 프로젝트 목적 및 주요 기능

### 핵심 기능
1. **다중 플랫폼 통합 검색**
   - TikTok (글로벌)
   - Douyin (중국)
   - 샤오홍슈 (라이프스타일)

2. **검색 결과 분석**
   - 크리에이터 정보 (팔로워, 좋아요)
   - 영상 메타데이터 (조회수, 댓글수, 공유수)
   - 해시태그 분석
   - 참여율 계산

3. **사용자 관리**
   - 자격증명 기반 회원가입/로그인
   - 관리자 승인 시스템
   - API 할당량 제한
   - 사용 통계 추적

4. **성능 최적화**
   - 계층형 캐시 (메모리 L1 + MongoDB L2)
   - 비동기 작업 큐 (BullMQ + Redis)
   - 병렬 스크래핑
   - Exponential Backoff 재시도 로직

5. **보안**
   - JWT 기반 세션 관리
   - bcrypt 비밀번호 해싱
   - OWASP 보안 헤더 설정
   - API 할당량 제한

---

## 6. 엔트리포인트와 전체 흐름

### A. 초기 로드 흐름
```
1. User 방문 → app/page.tsx
2. 메타데이터 로드 (SEO)
3. Providers (SessionProvider) 적용
4. HomeContent 렌더링 (플랫폼 카드)
5. 사용자 세션 확인 (NextAuth)
```

### B. 검색 흐름 (메인)
```
1️⃣ 사용자: 검색 페이지 (app/search/page.tsx)
   └─ 검색어 입력 + 플랫폼 선택 + 검색 버튼 클릭

2️⃣ 프론트엔드: POST /api/search 요청
   └─ 요청 데이터: { query, platform, dateRange }

3️⃣ API (app/api/search/route.ts):
   ├─ 인증 확인 (session 검증)
   ├─ 승인 상태 확인 (isApproved)
   ├─ L1 캐시 확인 (메모리)
   │  └─ 캐시 히트 → 즉시 결과 반환 (status: 'completed')
   └─ L2 캐시 확인 (MongoDB)
      └─ 캐시 미스 → 작업 큐에 추가 (status: 'queued')

4️⃣ BullMQ 큐: 작업 대기
   └─ 워커가 처리할 때까지 대기

5️⃣ Worker (lib/queue/search-worker.ts): 작업 처리
   ├─ Railway 서버로 스크래핑 시도 (프로덕션)
   │  └─ 실패 시 Fallback → 로컬 Apify 스크래퍼
   ├─ 플랫폼에 따라:
   │  ├─ TikTok: searchTikTokVideos()
   │  ├─ Douyin: searchDouyinVideosParallel()
   │  └─ Xiaohongshu: searchXiaohongshuVideosParallel()
   ├─ 결과 저장:
   │  ├─ L1: 메모리 캐시 (24시간 TTL)
   │  └─ L2: MongoDB 캐시 (90일 TTL)
   └─ 진행도 업데이트 (10% → 80% → 100%)

6️⃣ 프론트엔드: 폴링 (1초 간격)
   └─ GET /api/search/[jobId]
      ├─ 큐에서 작업 상태 조회
      ├─ 진행도 업데이트 (UI 진행 바)
      └─ 완료 시 결과 표시

7️⃣ 사용자: 검색 결과 표시
   └─ 크리에이터 카드 그리드 표시
      ├─ 프로필 이미지
      ├─ 팔로워/좋아요 통계
      └─ 프로필/분석 버튼
```

### C. 캐시 흐름 (상세)
```
L1 (메모리 캐시):
└─ LRU Cache: max 10,000개 항목, 24시간 TTL
   ├─ 매우 빠름 (밀리초)
   └─ 프로세스 메모리 내에서만 유지

L2 (MongoDB 캐시):
└─ MongoDB video_cache 컬렉션
   ├─ 90일 TTL 인덱스
   ├─ 조회 통계 추적 (accessCount, lastAccessedAt)
   └─ 복합 인덱스 (platform, query, dateRange)

조회 순서:
1. L1 캐시 확인 (메모리)
2. L2 캐시 확인 (MongoDB)
3. L1 캐시 워밍업 (DB에서 가져온 데이터를 메모리에 저장)
```

### D. 워커 흐름 (상세)
```
Worker Configuration:
├─ Concurrency: 50 (환경변수로 조정 가능)
├─ Limiter: 100 requests/1s
├─ Lock Duration: 5분 (300초)
├─ Lock Renew Time: 2.5분 (150초)
└─ Max Stalled Count: 2회

스크래핑 전략 (Fallback):
1. Railway 서버로 시도 (프로덕션)
   ├─ URL: process.env.RAILWAY_SERVER_URL
   ├─ 인증: X-API-Key 헤더
   └─ 타임아웃: 120초
2. 실패 시 → 로컬 Apify 스크래퍼 사용
   └─ API Key: process.env.APIFY_API_KEY

에러 처리:
├─ 429 (Rate Limit) → 자동 재시도 (1-2회)
├─ Timeout → "NETWORK_ERROR"
├─ 401 (Auth) → "AUTH_ERROR"
└─ DNS 실패 → "DNS_ERROR"
```

### E. 인증 흐름
```
1. 회원가입 → app/api/auth/signup/route.ts
   ├─ 입력 검증 (Zod)
   ├─ 비밀번호 해싱 (bcrypt)
   └─ 사용자 DB 저장 (MongoDB)
      └─ 상태: isApproved=false (관리자 승인 대기)

2. 로그인 → POST /api/auth/callback/credentials
   ├─ 이메일/비밀번호 검증
   ├─ 비밀번호 비교 (bcrypt.compare)
   ├─ 상태 확인:
   │  ├─ isApproved? (승인 대기 중 → 에러)
   │  ├─ isBanned? (차단된 계정 → 실패)
   │  └─ isActive? (비활성화 → 실패)
   └─ JWT 토큰 발급 + 세션 생성

3. 세션 관리
   ├─ Strategy: JWT
   ├─ Max Age: 30일
   ├─ Cookie: httpOnly, secure (프로덕션)
   └─ Update Age: 24시간 (자동 갱신)

4. API 호출 시 인증 확인
   ├─ await auth() → 현재 세션 조회
   ├─ session.user.id 확인
   └─ 미인증 → 401 에러 반환
```

### F. 관리자 패널 흐름
```
1. Queue Stats (app/api/admin/queue-stats/route.ts)
   └─ BullMQ 큐 상태 조회
      ├─ 대기 중인 작업 수
      ├─ 진행 중인 작업 수
      └─ 완료된 작업 수

2. 캐시 관리 (app/api/admin/cache/clear/route.ts)
   └─ 캐시 전체 삭제 옵션
```

---

## 7. 주요 설정 파일 분석

### package.json - 의존성
```json
핵심 의존성:
- next: 16.0.7 (프레임워크)
- react: 19.2.0
- mongodb: 6.10.0 (DB)
- bullmq: 5.66.5 (작업 큐)
- next-auth: 5.0.0-beta.30 (인증)
- tailwindcss: 4 (스타일)
- react-hook-form: 7.71.0 (폼)
```

### MongoDB 인덱스 전략
```typescript
Collections:
1. users
   └─ email (unique, primary key)
   └─ isActive, isBanned (조회 성능)
   └─ lastActive, createdAt (정렬)

2. api_usage
   └─ email + date (unique, 복합 인덱스)
   └─ email + date (역순 정렬용)

3. video_cache
   └─ cacheKey (unique)
   └─ platform + query + dateRange (검색)
   └─ expiresAt (TTL, 자동 삭제)
   └─ accessCount (인기도 분석)
   └─ createdAt, lastAccessedAt (정렬)
```

### 환경 변수
```env
필수:
- NEXTAUTH_SECRET: JWT 시크릿
- NEXTAUTH_URL: 애플리케이션 URL
- MONGODB_URI: MongoDB 연결 문자열
- APIFY_API_KEY: Apify 스크래퍼 API 키

선택:
- RAILWAY_SERVER_URL: Railway 프로덕션 서버
- RAILWAY_API_SECRET: Railway 인증 키
- WORKER_CONCURRENCY: 워커 동시성 (기본: 50)
```

---

## 8. 성능 최적화 전략

### 캐시 전략
- **L1 (메모리)**: 매우 자주 접근하는 데이터 (밀리초 응답)
- **L2 (MongoDB)**: 장기 저장 (프로세스 재시작 후에도 유지)

### 작업 큐 전략
- **동기 처리 불가 제거**: 무거운 스크래핑 작업을 비동기로 처리
- **병렬 처리**: 최대 50개 작업 동시 처리
- **재시도 로직**: Exponential Backoff로 안정성 향상

### 스크래핑 Fallback 전략
1. Railway 프로덕션 서버 사용 (빠르고 안정)
2. 실패 시 로컬 Apify 스크래퍼 사용
3. Rate Limit 시 자동 재시도

---

## 9. 배포 설정

### PM2 설정 (ecosystem.config.js)
```javascript
두 개의 앱:
1. tiktalk-killa-web
   └─ npm run dev (프론트엔드 + API)

2. tiktalk-killa-worker
   └─ 3개 인스턴스 (클러스터 모드)
   └─ 각각 50개 동시 작업 처리
   └─ 메모리 제한: 2GB
```

### Docker 설정
```yaml
Redis 컨테이너:
├─ redis:7-alpine
├─ 포트: 6379
├─ 메모리 정책: LRU
├─ Persistence: RDB + AOF
└─ Health Check: redis-cli ping
```

### Next.js 보안 헤더
```
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), microphone=(), camera=()
- Strict-Transport-Security: max-age=31536000
```

---

## 10. 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│              (app/search/page.tsx)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Query      │  │  Platform    │  │  Date Range  │          │
│  │   Input      │  │  Selection   │  │  Filter      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────┬────────────────────────────────────┘
                           │ POST /api/search
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API Layer                                      │
│              (app/api/search/route.ts)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Authentication Check (NextAuth)                      │  │
│  │ 2. Approval Status Check                                │  │
│  │ 3. L1 Cache Check (Memory - LRU)                        │  │
│  │    ├─ MISS → L2 Cache Check                            │  │
│  │    └─ HIT → Return Cached Data                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                    Cache MISS                                  │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Add Job to Queue (BullMQ)                               │  │
│  │ Return: { jobId, estimatedWait, queuePosition }        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                    GET /api/search/[jobId]
                    (Polling every 1s)
                           │
┌─────────────────────────────────────────────────────────────────┐
│                  Worker Layer                                   │
│         (lib/queue/search-worker.ts)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Job Processing:                                         │  │
│  │ 1. Try Railway Server (Production)                      │  │
│  │ 2. Fallback: Local Apify Scraper                        │  │
│  │    ├─ TikTok: searchTikTokVideos()                      │  │
│  │    ├─ Douyin: searchDouyinVideosParallel()             │  │
│  │    └─ Xiaohongshu: searchXiaohongshuVideosParallel()   │  │
│  │ 3. Error Handling:                                      │  │
│  │    ├─ 429 Rate Limit → Retry with Exponential Backoff │  │
│  │    ├─ Timeout → Network Error                          │  │
│  │    └─ Auth Error → Invalid API Key                     │  │
│  │ 4. Update Progress (10% → 80% → 100%)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Save to Cache:                                          │  │
│  │ ├─ L1: Memory Cache (24h TTL, max 10k items)          │  │
│  │ └─ L2: MongoDB (90d TTL)                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Data Storage                                   │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │   Redis (Queue)  │  │      MongoDB (Database)              │ │
│  │  ┌────────────┐  │  │  ┌──────────────────────────────────┐│ │
│  │  │ Job Status │  │  │  │ Collections:                     ││ │
│  │  │ Job Queue  │  │  │  │ ├─ users                         ││ │
│  │  │ Progress   │  │  │  │ ├─ api_usage                     ││ │
│  │  └────────────┘  │  │  │ ├─ video_cache (with TTL)        ││ │
│  └──────────────────┘  │  │ │ └─ Indexes (optimized)          ││ │
│                        │  │ └──────────────────────────────────┘│ │
│                        └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               Search Results Display                             │
│          (React Components - Search Page)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ├─ Creator Profile Cards                                │  │
│  │ ├─ Follower/Like Statistics                             │  │
│  │ ├─ Video Metadata (views, comments, shares)             │  │
│  │ └─ Action Buttons (Profile, Analysis)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. 현재 진행 상황 (test4 브랜치)

### 최근 커밋
1. `eb45d2c` - 초대코드 추가
2. `091a9cc` - SMS 인증 기능 제거
3. `ed99601` - 명칭 한글로 변경
4. `f9cd67e` - 진행 바 깜빡임 해결 및 색상 통일
5. `393b92c` - Redis 연결 에러 - 빌드 시점 초기화 방지

### 완성된 기능
- ✅ UI 구조 (홈페이지, 검색 페이지, 로그인/가입)
- ✅ 인증 시스템 (자격증명 기반)
- ✅ 비동기 검색 큐 (BullMQ + Redis)
- ✅ 계층형 캐싱 시스템
- ✅ MongoDB 연결 및 인덱싱
- ✅ PM2 워커 설정
- ✅ 보안 헤더 설정

### 진행 중인 작업
- ⏳ 웹 스크래퍼 최적화
- ⏳ Railway 프로덕션 서버 통합
- ⏳ 분석 기능 확장
- ⏳ 관리자 패널 완성

---

## 12. 요약

**TikTalk Killa**는 TikTok, Douyin, 샤오홍슈를 통합 검색하고 분석하는 종합 도구입니다.

**핵심 아키텍처**:
- **프론트**: Next.js App Router + React 19
- **백엔드**: Next.js API Routes + NextAuth
- **DB**: MongoDB (메인) + Redis (큐) + LRU Cache (메모리)
- **스크래핑**: Apify API (with Railway Fallback)
- **작업 처리**: BullMQ 비동기 큐

**성능 최적화**:
- 계층형 캐싱 (메모리 L1 + DB L2)
- 병렬 스크래핑 (최대 50개 동시)
- Fallback 전략으로 안정성 보장
- 자동 재시도 로직 (Exponential Backoff)

**보안**:
- JWT 기반 인증
- 관리자 승인 시스템
- OWASP 보안 헤더
- API 할당량 제한

이는 중규모 SaaS 플랫폼으로 확장 가능한 구조를 갖추고 있습니다.
