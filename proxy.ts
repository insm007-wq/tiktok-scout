import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  console.log(`[Proxy] ${pathname} 요청 - 인증 검사 중...`)

  // 공개 라우트 (인증 불필요)
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/signup') ||
    pathname.startsWith('/auth/error')

  if (isPublicRoute) {
    console.log(`[Proxy] ${pathname} - 공개 라우트, 통과`)
    return NextResponse.next()
  }

  // 인증 상태 확인
  const session = await auth()
  console.log(`[Proxy] ${pathname} - 세션 확인: ${session ? '로그인됨' : '미로그인'}`)

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!session) {
    console.log(`[Proxy] ${pathname} - 미로그인 사용자, 로그인 페이지로 리다이렉트`)
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 관리자 라우트 확인
  if (pathname.startsWith('/admin') && !session.user.isAdmin) {
    console.log(`[Proxy] ${pathname} - 관리자 아님, 대시보드로 리다이렉트`)
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  console.log(`[Proxy] ${pathname} - 통과`)
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/admin/:path*', '/api/brightdata/:path*', '/api/admin/:path*'],
}
