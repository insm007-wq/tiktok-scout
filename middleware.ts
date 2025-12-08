import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // 모든 요청 허용
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
}
