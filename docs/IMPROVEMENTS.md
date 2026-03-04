# 보강 권장 사항 (유료화 / 운영 안정성)

프로젝트 점검 결과, 아래 항목들을 보강하면 유료화·운영에 더 안전합니다.

---

## 1. 회원 탈퇴 시 구독 연동 (중요)

**현재:** `withdrawUser()`는 `users`만 갱신하고, `subscriptions`/빌링은 건드리지 않음.  
**문제:** 구독 중인 사용자가 탈퇴해도 다음 달에 크론이 빌링키로 자동 결제 시도 가능.

**보강:**
- 탈퇴 API(`/api/auth/withdraw`)에서, 해당 이메일의 `subscriptions`가 `active`이면 구독 취소 처리 후 탈퇴 진행.
- 또는 `withdrawUser()` 내부에서 `subscriptions`를 `status: 'cancelled'`, `cancelledAt: now`로 업데이트.

---

## 2. 검색 API 입력 검증

**현재:** `query` trim만 하고, `platform`은 body 그대로 사용.  
**문제:** `platform`에 `'tiktok' | 'douyin'` 이외 값이 오면 캐시/큐/스크래퍼에서 오동작 가능.

**보강:**
- `platform` 화이트리스트 검증 추가.
  ```ts
  const VALID_PLATFORMS: Platform[] = ['tiktok', 'douyin'];
  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: '유효하지 않은 플랫폼입니다.' }, { status: 400 });
  }
  ```
- `query` 길이 상한(예: 100자) 적용 시 DoS/저장소 남용 완화에 도움.

---

## 3. 관리자 전용 API 보호

**현재:** DB 초기화 등 관리자 전용 라우트가 없음. `isAdmin`은 미들웨어가 아닌 개별 API에서만 사용.  
**보강:**
- 관리자만 호출 가능한 API(예: DB 초기화, 사용자 목록/역할 변경)는 `auth()` 후 `session.user.isAdmin === true` 검사 필수.
- DB 초기화용 스크립트/API를 만든다면 반드시 관리자 또는 `CRON_SECRET`급 비밀값으로 보호.

---

## 4. 결제·구독 관련 (선택)

- **중복 결제 방지:** `billing-auth`에서 결제 성공 후 `payment_orders.insertOne` 시 `orderId`가 이미 있으면 실패하도록 하거나, “이미 처리된 orderId”면 스킵하는 로직이 있으면 안전함. (현재는 매 요청마다 새 `ObjectId`로 orderId 생성이라 실질적 중복 가능성은 낮음.)
- **토스 웹훅:** 빌링키 결제는 현재 동기 응답만 사용 중. 토스에서 비동기 알림(웹훅)을 쓸 계획이면, 웹훅 수신 엔드포인트와 서명 검증 추가를 권장.

---

## 5. 환경 변수·문서

**현재:** `.env.example`에 MongoDB, NextAuth, Resend, 토스, CRON_SECRET만 있음.  
**보강:**
- Redis, Apify, 기타 필수 env를 `.env.example`에 주석으로라도 명시하면 배포 시 실수 감소.
- `README` 또는 운영 문서에 “유료 오픈 전 점검 목록”(결제 테스트, 크론 등)을 적어두면 좋음.

---

## 6. 기타

- **Recrawl Redis 실패 시:** 현재는 Redis 오류 시 rate limit을 열어둠(fail open). 운영 환경에서는 Redis 가용성을 모니터링하고, 필요 시 알림 추가 권장.
- **DEBUG 로그:** `lib/cache.ts`, `app/dashboard/search.tsx` 등에 남아 있는 `console.log`는 운영 시 로그 레벨 또는 환경 변수로 끄면 좋음.

---

## 우선순위 요약

| 순서 | 항목                         | 중요도 |
|------|------------------------------|--------|
| 1    | 탈퇴 시 구독 취소 연동       | 높음   |
| 2    | 검색 API platform 검증       | 중간   |
| 3    | 관리자 API 보호 / DB 초기화  | 중간   |
| 4    | .env.example·운영 문서 보강  | 낮음   |
| 5    | 결제 중복 방지·웹훅 (선택)   | 선택   |
