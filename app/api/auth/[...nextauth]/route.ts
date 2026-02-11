import { NextRequest, NextResponse } from 'next/server'
import { handlers } from '@/lib/auth'

const SESSION_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
]

function isJWTSessionError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const e = error as { name?: string; type?: string; message?: string }
    return (
      e.name === 'JWTSessionError' ||
      e.type === 'JWTSessionError' ||
      (typeof e.message === 'string' && e.message.includes('JWTSessionError'))
    )
  }
  return false
}

async function handleWithJwtFallback(
  handler: (req: NextRequest) => Promise<Response>,
  req: NextRequest
): Promise<Response> {
  try {
    return await handler(req)
  } catch (error) {
    if (isJWTSessionError(error)) {
      const url = new URL('/auth/login', req.url)
      const res = NextResponse.redirect(url, 302)
      for (const name of SESSION_COOKIE_NAMES) {
        res.cookies.set(name, '', { path: '/', maxAge: 0 })
      }
      return res
    }
    throw error
  }
}

export async function GET(req: NextRequest) {
  return handleWithJwtFallback(handlers.GET, req)
}

export async function POST(req: NextRequest) {
  return handleWithJwtFallback(handlers.POST, req)
}
