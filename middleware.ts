import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decode } from 'jwt-simple'

// 메모리 캐시: 사용자 별 마지막 updateLastActive 시간 (30초 throttling)
const lastUpdateCache = new Map<string, number>()

export async function middleware(req: NextRequest) {
  // ✅ 세션 쿠키 존재 여부 확인 (로그인 상태 확인)
  const sessionToken = req.cookies.get('authjs.session-token')?.value ||
                      req.cookies.get('__Secure-authjs.session-token')?.value

  const isAuthenticated = !!sessionToken
  const isDashboard = req.nextUrl.pathname.startsWith('/dashboard')
  const isAPI = req.nextUrl.pathname.startsWith('/api/youtube')

  // ✅ 대시보드 접근 차단
  if (!isAuthenticated && isDashboard) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // ✅ API 접근 차단 (youtube API만)
  if (!isAuthenticated && isAPI) {
    return NextResponse.json(
      { error: '인증이 필요합니다. 로그인해주세요.' },
      { status: 401 }
    )
  }

  // ✅ 인증된 요청에서 lastActive 자동 갱신 (30초 throttling)
  if (isAuthenticated && (isDashboard || isAPI)) {
    try {
      // JWT 토큰이 유효한지 확인 (3개 세그먼트가 있는지 확인)
      if (sessionToken && sessionToken.split('.').length === 3) {
        const secret = process.env.NEXTAUTH_SECRET || 'default-secret'
        try {
          const decoded = decode(sessionToken, secret, true)
          const email = decoded.email || decoded.sub

          if (email) {
            const now = Date.now()
            const lastUpdate = lastUpdateCache.get(email) || 0

            // 30초 이상 경과했을 때만 DB 업데이트
            if (now - lastUpdate > 30000) {
              lastUpdateCache.set(email, now)
              console.log(`🔵 [Middleware] 사용자 활동 추적: ${email} (${req.nextUrl.pathname})`)

              // 비동기로 updateLastActive 호출 (응답 지연 방지)
              updateLastActiveAsync(email).catch(err => {
                console.error('❌ lastActive 업데이트 실패:', err)
              })
            }
          }
        } catch (decodeError) {
          console.error('❌ JWT 디코딩 실패:', decodeError)
        }
      }
    } catch (error) {
      console.error('❌ 토큰 처리 에러:', error)
    }
  }

  return NextResponse.next()
}

/**
 * lastActive 비동기 업데이트
 * 미들웨어의 응답 지연을 방지하기 위해 비동기로 처리
 */
async function updateLastActiveAsync(email: string) {
  try {
    const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/update-last-active`
    console.log(`🔄 [Middleware] updateLastActiveAsync 호출: ${email} -> ${url}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      console.error(`❌ [Middleware] updateLastActiveAsync 실패: ${email} (상태: ${response.status})`)
    } else {
      console.log(`✅ [Middleware] updateLastActiveAsync 성공: ${email}`)
    }
  } catch (error) {
    console.error(`❌ [Middleware] updateLastActiveAsync 호출 실패 (${email}):`, error)
  }
}

// ✅ 미들웨어가 실행될 경로 설정
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/youtube_search',
    '/api/youtube_channel',
    '/api/youtube_comments',
  ],
}
