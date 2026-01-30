# ✅ 스마트 캐싱 + 인기 검색어 자동 갱신 구현 완료

**구현 날짜**: 2026-01-30
**전략**: R2 제거 + 24시간 TTL 캐시 + 12시간 자동 갱신

---

## 🎯 핵심 변경사항 요약

### Phase 1: MongoDB 스키마 개선 ✅
- `searchCount` 필드 추가 (인기도 추적)
- TTL 변경: 90일 → **24시간**
- MongoDB 인덱스: `searchCount: -1` 추가
- `getPopularQueries()` 함수 구현

### Phase 2: 자동 갱신 API ✅
- 새 엔드포인트: `GET/POST /api/cron/refresh-popular`
- Vercel Cron 설정: 12시간마다 자동 실행
- MongoDB → BullMQ Queue → Railway Worker 흐름

### Phase 3: 스크래퍼 정정 ✅
- `uploadMediaToR2()` 호출 제거
- CDN URL 직접 반환
- 변경 파일: douyin.ts, tiktok.ts, xiaohongshu.ts

### Phase 4: R2 파일 제거 ✅
- `lib/storage/r2.ts` 삭제
- `app/api/upload-to-r2/route.ts` 삭제
- `app/api/cdn-to-r2/route.ts` 삭제

---

## 📊 구현 현황

| 파일 | 상태 | 변경사항 |
|------|------|--------|
| `lib/models/VideoCache.ts` | ✅ 수정 | searchCount, lastRefreshedAt 필드 추가 |
| `lib/cache.ts` | ✅ 수정 | searchCount 추적, getPopularQueries() 함수 |
| `lib/mongodb.ts` | ✅ 수정 | TTL 인덱스, searchCount 인덱스 추가 |
| `app/api/cron/refresh-popular/route.ts` | ✅ 신규 | 자동 갱신 엔드포인트 |
| `vercel.json` | ✅ 수정 | refresh-popular 크론 설정 추가 |
| `lib/scrapers/douyin.ts` | ✅ 수정 | R2 제거, CDN URL 직접 반환 |
| `lib/scrapers/tiktok.ts` | ✅ 수정 | R2 제거, CDN URL 직접 반환 |
| `lib/scrapers/xiaohongshu.ts` | ✅ 수정 | R2 제거, CDN URL 직접 반환 |
| `lib/storage/r2.ts` | ✅ 삭제 | 완전 제거 |
| `app/api/upload-to-r2/route.ts` | ✅ 삭제 | 완전 제거 |
| `app/api/cdn-to-r2/route.ts` | ✅ 삭제 | 완전 제거 |

---

## 🚀 배포 체크리스트

- [ ] Environment Variables 설정
  - `CRON_SECRET` (Vercel Cron 인증)
  - `ADMIN_SECRET` (수동 갱신 테스트용)

- [ ] MongoDB 인덱스 생성 확인
  - `searchCount: -1` 인덱스

- [ ] Vercel 배포 확인
  - vercel.json 크론 설정 활성화

- [ ] Apify 크레딧 확인
  - 월 500K+ 필요 (인기 검색어 자동 갱신 추가 비용)

---

## 💡 다음 단계

1. **로컬 테스트**
   ```bash
   npm run dev
   # 검색 5회 반복
   # MongoDB searchCount 확인
   # 수동 갱신 테스트
   ```

2. **배포**
   ```bash
   git add .
   git commit -m "feat: Smart caching + auto-refresh popular queries (R2 removed)"
   git push origin test5
   # → Create PR → Merge → Vercel auto-deploy
   ```

3. **모니터링**
   - Cron 실행 로그 확인 (Vercel 대시보드)
   - CDN URL 만료 여부 모니터링
   - 검색 통계 분석

---

## 📚 참고 자료

- Vercel Cron: https://vercel.com/docs/cron-jobs
- BullMQ: https://docs.bullmq.io/
- MongoDB TTL: https://docs.mongodb.com/manual/core/index-ttl/

**작성일**: 2026-01-30
**상태**: 구현 완료 ✅
