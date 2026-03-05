# TikTalk Killa

TikTok, Douyin 비디오 검색 및 분석 도구입니다.

## 📁 프로젝트 구조

```
titok-killa/
├── app/                          # Next.js App Router
│   ├── api/                      # API 라우트 (TikTok API 통합 예정)
│   ├── components/               # React 컴포넌트 (UI)
│   ├── dashboard/                # 대시보드 페이지
│   ├── login/                    # 로그인 페이지
│   ├── privacy/                  # 개인정보 보호 정책
│   ├── terms/                    # 이용약관
│   ├── types/                    # TypeScript 타입 정의
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 홈페이지
│   └── globals.css               # 전역 스타일
├── lib/                          # 유틸리티 함수
│   ├── mongodb.ts                # MongoDB 연결
│   ├── userLimits.ts             # 사용자 할당량 관리
│   ├── apiUsage.ts               # API 사용량 추적
│   ├── dateUtils.ts              # 날짜 유틸리티
│   ├── durationUtils.ts          # 길이 유틸리티
│   ├── engagementUtils.ts        # 참여율 유틸리티
│   └── formatters.ts             # 포맷팅 유틸리티
├── auth.ts                       # NextAuth 설정 (OAuth)
├── middleware.ts                 # 요청 미들웨어
├── package.json                  # 프로젝트 의존성
├── tsconfig.json                 # TypeScript 설정
├── tailwind.config.ts            # Tailwind CSS 설정
├── next.config.ts                # Next.js 설정
└── README.md                     # 이 파일
```

## 🚀 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local.example`을 `.env.local`로 복사하고 필요한 값들을 설정하세요:

```bash
cp .env.local.example .env.local
```

필수 환경 변수:
- `AUTH_SECRET` - Auth.js JWT 시크릿 (또는 `NEXTAUTH_SECRET`)
- `AUTH_URL` - 애플리케이션 절대 URL (예: `https://tiktalk-killa.com`, 또는 `NEXTAUTH_URL`)
- **배포 시 리다이렉트 루프 방지**: `AUTH_TRUST_HOST=true` 반드시 설정
- `MONGODB_URI` - MongoDB 연결 문자열
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `AUTH_KAKAO_ID` / `AUTH_KAKAO_SECRET` - Kakao OAuth
- `AUTH_NAVER_ID` / `AUTH_NAVER_SECRET` - Naver OAuth

### 3. 개발 서버 시작
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 열기

### Vercel 배포 시 ERR_TOO_MANY_REDIRECTS 방지

프론트를 **Vercel**에서 배포할 때 "리디렉션한 횟수가 너무 많습니다"가 나오면, Vercel에서 아래 환경 변수를 넣어주세요.

1. **Vercel 대시보드** → 프로젝트 선택 → **Settings** → **Environment Variables**
2. 다음 변수 추가 (Production에 체크):

| 이름 | 값 | 비고 |
|------|-----|------|
| `AUTH_URL` | `https://tiktalk-killa.com` | 커스텀 도메인 사용 시 그 주소로. Vercel 기본 도메인만 쓰면 `https://프로젝트명.vercel.app` |
| `AUTH_TRUST_HOST` | `true` | **필수** — Vercel 프록시 뒤에서 호스트 신뢰 |
| `AUTH_SECRET` | (랜덤 문자열) | 없으면 `openssl rand -base64 32`로 생성. 기존 `NEXTAUTH_SECRET` 있어도 동일 값 사용 가능 |

3. **Save** 후 상단 **Deployments** → 최신 배포 옆 **⋯** → **Redeploy** (캐시 없이 재배포 권장).

그래도 오류가 나면 사용자에게 **해당 사이트 쿠키 삭제** 후 다시 접속하라고 안내하세요.

## 📦  기술 스택

- **프레임워크**: Next.js 16.0.1
- **UI 라이브러리**: React 19.2.0
- **스타일링**: Tailwind CSS 4
- **인증**: NextAuth v5
- **데이터베이스**: MongoDB
- **타입스크립트**: 5.9.3

## 🎯 현재 상태

✅ UI 구조 완성
⏳ TikTok API 통합 (진행 중)

## 📝 다음 단계

1. TikTok API 엔드포인트 구현
2. API 서명 (X-Bogus, X-Gnarly) 통합
3. 데이터 필터링 로직 (기간, 길이, 인기도 등)
4. 결과 테이블 및 분석 기능 구현
5. 테스트 및 배포

## 🔐 보안

- JWT 기반 세션 관리
- 미들웨어를 통한 접근 제어
- OWASP 보안 헤더 설정
- API 할당량 제한

## 📄 라이선스

MIT
