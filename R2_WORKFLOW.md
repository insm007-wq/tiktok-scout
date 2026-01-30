# R2 통합 흐름도

## 전체 동작 흐름

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
┌──────────────────────┐
│   검색 Queue         │
│  (Redis/Background)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────┐
│   Railway Worker             │
│   (tiktok-scraper 백엔드)     │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   uploadMediaToR2()          │
│   - 썸네일 다운로드           │
│   - 비디오 URL 정상화        │
│   - 3회 재시도 (지수 백오프)  │
│   - CDN 파라미터 제거 재시도  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   Cloudflare R2              │
│   - tiktok-videos-storage    │
│   - 버킷에 미디어 저장        │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   MongoDB Cache              │
│   - R2 URL 저장              │
│   - 메타데이터 저장           │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   프론트엔드                   │
│   - R2 URL 반환              │
│   - 캐시 히트 처리           │
└──────────────────────────────┘
```

## 상세 흐름

### 1️⃣ 검색 요청
```
사용자 → tik-tok-scout 검색 → Queue에 추가
```

### 2️⃣ 스크래핑 작업
```
Railway Worker가 Queue에서 작업 가져오기
↓
TikTok/Douyin/Xiaohongshu 스크래핑
↓
uploadMediaToR2() 호출
```

### 3️⃣ R2 업로드 프로세스
```
CDN URL 다운로드
↓
실패 시:
  - 재시도 (3회, 지수 백오프)
  - CDN 쿼리 파라미터 제거 후 재시도
↓
성공 → R2에 저장 → R2 URL 획득
실패 → CDN URL 그대로 사용
```

### 4️⃣ 캐시 저장
```
MongoDB에 저장:
{
  thumbnail: R2 URL (또는 CDN URL),
  videoUrl: R2 URL (또는 CDN URL),
  ...메타데이터
}
```

### 5️⃣ 프론트엔드 처리
```
캐시된 데이터 조회:
  - R2 URL 있음 → 그대로 사용 ✅
  - CDN URL만 있음:
      - 이미지 로드 실패 시
      - /api/cdn-to-r2 호출
      - R2 URL로 변환 및 재시도
```

## 환경 변수

```env
# R2 설정
R2_BUCKET_NAME=tiktok-videos-storage
R2_PUBLIC_DOMAIN=https://pub-e7c1a9fcc1354653a54a231bf19ecf7b.r2.dev
R2_ACCESS_KEY_ID=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret-key>
R2_ACCOUNT_ID=<your-account-id>
```

## 핵심 포인트

✅ **중복 방지**: `fileExists()` 체크로 동일 파일 재업로드 방지
✅ **재시도 로직**: 3회 재시도 + 지수 백오프 + CDN 파라미터 제거
✅ **플랫폼별 헤더**: TikTok/Douyin/Xiaohongshu별 User-Agent 자동 설정
✅ **타임아웃**: 30초 타임아웃 설정으로 무한 대기 방지
✅ **폴백 메커니즘**: R2 실패 시 CDN URL 사용, CDN 이미지 로드 실패 시 R2 변환 재시도

## 파일 위치

| 역할 | 파일 |
|------|------|
| R2 업로드 API | `app/api/upload-to-r2/route.ts` |
| CDN→R2 변환 API | `app/api/cdn-to-r2/route.ts` |
| 검색 UI (썸네일 처리) | `app/dashboard/search.tsx` |
| 유틸리티 스크립트 | `scripts/*.ts` |

## 24시간 후 동작

```
새 검색 요청
├─ 기존 캐시 있음
│  └─ R2 URL 있음 → 그대로 사용
│  └─ CDN URL만 있음 → 프론트엔드에서 R2 변환
├─ 캐시 없음
│  └─ 새로 스크래핑 → R2에 저장 → 캐시 저장
```

## 90일 후 동작

```
캐시 만료
├─ 재스크래핑 필요
├─ 같은 파일명 확인 (fileExists)
├─ 파일 존재함 → 재업로드 방지 (비용 절감)
├─ 새 메타데이터만 업데이트
└─ 프론트엔드에 R2 URL 반환
```
