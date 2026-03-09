import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const PROTECTED_PATHS = ['/dashboard', '/profile', '/search', '/payments']
const AUTH_PATHS = ['/auth/login', '/auth/signup', '/auth/forgot-password']

// auth(handler) 패턴: JWTSessionError 발생 시 자동으로 쿠키 삭제 + req.auth에 세션 주입
export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // 보호 경로: 비로그인 시 로그인 페이지로 이동
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  if (isProtected && !session) {
    const loginUrl = new URL('/auth/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 이메일 미인증 사용자 차단 (isVerified === false일 때만. undefined는 구 JWT 호환으로 통과)
  if (isProtected && session && session.user?.isVerified === false) {
    const loginUrl = new URL('/auth/login', req.nextUrl.origin)
    loginUrl.searchParams.set('error', 'verify_required')
    return NextResponse.redirect(loginUrl)
  }

  // 인증 페이지: 이미 로그인 + 이메일 인증된 경우에만 대시보드로 이동
  // 이메일 미인증(isVerified === false) 사용자는 로그인 페이지에 머물러 안내 메시지를 보도록 함
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))
  if (isAuthPage && session && session.user?.isVerified !== false) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
}
