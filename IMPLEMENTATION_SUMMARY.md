# Douyin 24시간 후 비디오 다운로드 실패 문제 해결 - 구현 완료

## 문제 요약

재크롤링 후 프론트엔드가 오래된 비디오 객체를 사용하여 **무한 403 루프** 발생:
1. CDN URL이 24시간 후 만료 → 403 Forbidden
2. 자동 재크롤링 트리거 → 새로운 데이터를 DB에 저장
3. **하지만 프론트엔드는 여전히 오래된 video.videoUrl 사용** → 다시 403
4. 무한 반복...

## 해결책: 재크롤링 후 Video 객체 업데이트

### 변경사항

**파일: `app/dashboard/search.tsx`**

#### 1단계: `handleRecrawl` 함수 수정 (라인 876-960)

**반환 타입 변경:**
- Before: `Promise<boolean>`
- After: `Promise<{ success: boolean; videos?: Video[] }>`

**변경 내용:**
- 재크롤링 완료 시, `statusData.data` (새로운 비디오 배열)를 함께 반환
- 콘솔에 "Fresh videos count: X" 로깅으로 데이터 확인 가능

```typescript
if (statusData.status === "completed") {
  console.log("[Recrawl] ✅ Completed");

  // ✅ 새로운: 최신 비디오 데이터 가져오기
  const freshVideos = statusData.data || [];
  console.log("[Recrawl] Fresh videos count:", freshVideos.length);

  addToast("success", "새로운 데이터를 가져왔습니다!", "✅ 완료", 3000);

  return { success: true, videos: freshVideos };
}
```

#### 2단계: `handleDownloadVideo` 함수 수정 (라인 1024-1070)

**403 에러 발생 시 처리:**
- 재크롤링 호출에서 `result.success && result.videos` 확인
- 새 비디오 배열에서 ID로 일치하는 비디오 찾기 (`find(v => v.id === video.id)`)
- 찾으면: 새 video 객체로 재시도
- 못 찾으면: 경고 토스트 표시

```typescript
const result = await handleRecrawl(searchInput, platform, filters.uploadPeriod);

if (result.success && result.videos) {
  console.log("[Download] Recrawl completed, searching for fresh video data...");

  // ✅ ID로 새 결과에서 같은 비디오 찾기
  const freshVideo = result.videos.find(v => v.id === video.id);

  if (freshVideo) {
    console.log("[Download] Fresh video found, retrying with new URL");
    // ... (새로운 freshVideo로 재시도)
    return handleDownloadVideo(freshVideo);
  } else {
    console.warn("[Download] Video not found in fresh results");
    addToast("warning", "재크롤링 후 해당 영상을 찾을 수 없습니다.", "⚠️ 경고", 5000);
  }
}
```

#### 3단계: `handleExtractSubtitles` 함수 수정 (라인 1170-1201)

다운로드와 동일한 로직 적용:
- 재크롤링 후 새 비디오 배열에서 ID로 찾기
- 새로운 video 객체로 자막 추출 재시도

## 핵심 개선사항

### 1. **비디오 데이터 갱신**
   - 재크롤링 완료 시 새로운 비디오 배열 반환
   - 오래된 video.videoUrl 대신 새로운 URL 사용
   - **403 에러 무한 루프 해결**

### 2. **ID 기반 매칭**
   - 비디오 순서 변경 상관없음
   - 정확한 비디오 식별 가능
   - 스크래퍼가 다른 비디오 반환해도 올바른 비디오 찾기

### 3. **에러 처리**
   - 영상이 없어진 경우 (사용자가 삭제): 경고 메시지 표시
   - 재크롤링 실패: 기존 에러 처리 작동
   - 우아한 실패(graceful fallback)

### 4. **사용자 경험**
   - 비디오 목록 순서 유지 (스크롤 위치 손실 없음)
   - 자동 재시도로 사용자 개입 없음
   - 진행 상황 토스트 알림으로 상태 전달

## 검증

### 빌드 테스트 ✅
```bash
npm run build
# Result: ✓ Compiled successfully in 3.9s
```

### 타입 검증 ✅
- `handleRecrawl` 반환 타입 정확함
- 모든 `handleRecrawl` 호출 시 `result.videos` 접근 안전함
- TypeScript 컴파일 오류 없음

### 런타임 검증
다음 패턴을 콘솔 로그에서 확인:

```
[Recrawl] Fresh videos count: 47
[Download] Recrawl completed, searching for fresh video data...
[Download] Fresh video found, retrying with new URL
[Download] ✅ 다운로드 완료
```

## 테스트 방법

### 자동 테스트 시나리오
1. **준비:** Douyin에서 "프라이팬" 검색 → 비디오 표시
2. **24시간 시뮬레이션:** 
   - 캐시 수동 만료 또는 24시간 대기
3. **다운로드 클릭:** 
   - 403 Forbidden 에러 발생
   - 자동 재크롤링 시작
4. **검증:**
   - 콘솔에서 "Fresh videos count: X" 확인
   - 콘솔에서 "Fresh video found, retrying with new URL" 확인
   - 다운로드 성공 (새 CDN URL 사용)

### 자막 추출 테스트
1. 다운로드와 동일하게 403 트리거
2. 자막 추출 클릭
3. 콘솔에서 "[ExtractSubtitles] Fresh video found" 확인
4. 자막 파일 성공적으로 다운로드

### 쿨다운 테스트
1. 같은 검색의 비디오 A 다운로드 → 403 → 재크롤링
2. 1분 이내 비디오 B 다운로드 → 쿨다운으로 인해 불필요한 재크롤링 방지
3. 콘솔에서 "Recrawl cooldown active" 확인

## 위험도 평가

### 낮은 위험
- ✅ 프론트엔드 로직만 변경
- ✅ DB 스키마 변경 없음
- ✅ API 엔드포인트 변경 없음
- ✅ 백엔드 코드 변경 없음

### 엣지 케이스 처리
- ✅ 영상이 삭제된 경우 → 경고 토스트 표시
- ✅ 재크롤링 실패 → 기존 에러 처리
- ✅ ID 매칭 실패 → 사용자 알림 후 종료

## 영구적 해결책 (향후 고려)

현재 구현은 **24시간마다 재크롤링이 필요**합니다.

**장기 솔루션 옵션:**

1. **R2 스토리지 업로드** (권장)
   - 다운로드 실패 시 on-demand R2 업로드
   - 또는 인기 영상만 자동 R2 업로드

2. **재크롤링 시 `shouldDownloadVideos: true`**
   - 재크롤링 작업만 비디오 다운로드
   - 영구적 CDN URL 확보
   - 초기 검색은 빠르게 유지

3. **API 변경 없이 프론트엔드 개선**
   - 첫 다운로드 시점에 R2 업로드
   - 이후 다운로드는 R2에서 직접 제공

## 제외 사항

**이 계획 범위 밖:**
- `douyin.ts`의 `shouldDownloadVideos: false` 설정 (속도 우선)
- R2 스토리지 통합 (별도 계획 필요)
- 사용자 상태에서 videos 배열 자동 업데이트 (선택사항)

**이유:**
- 현재 구현이 즉각적인 문제 해결
- 영구적 해결책은 더 큰 아키텍처 변경 필요

## 파일 변경 요약

| 파일 | 함수 | 변경사항 |
|------|------|---------|
| `app/dashboard/search.tsx` | `handleRecrawl` | 비디오 배열 반환 |
| `app/dashboard/search.tsx` | `handleDownloadVideo` | ID 기반 비디오 매칭 및 재시도 |
| `app/dashboard/search.tsx` | `handleExtractSubtitles` | ID 기반 비디오 매칭 및 재시도 |

**변경 라인:**
- `handleRecrawl`: 880 (반환 타입), 922-927 (데이터 반환)
- `handleDownloadVideo`: 1026-1070 (재크롤링 후 처리)
- `handleExtractSubtitles`: 1170-1201 (재크롤링 후 처리)

## 배포 준비

### Pre-deployment 체크리스트
- [x] TypeScript 컴파일 성공
- [x] 빌드 성공 (`npm run build`)
- [x] 반환 타입 정확성 검증
- [x] 에러 처리 완성
- [x] 콘솔 로깅 추가
- [x] 토스트 메시지 한글화

### Post-deployment 모니터링
- 콘솔에서 `[Recrawl]` 로그 패턴 모니터링
- 사용자 피드백 수집 (403 에러 감소 확인)
- 재크롤링 쿨다운 효과 측정

---

**작성일:** 2026-01-29
**구현 상태:** ✅ 완료
**테스트 상태:** ✅ TypeScript 빌드 통과
