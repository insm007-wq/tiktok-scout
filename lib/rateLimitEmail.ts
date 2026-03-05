import type { NextRequest } from 'next/server'
import type { Db } from 'mongodb'

const COLLECTION = 'email_send_rate_limits'
/** IP당 1시간 동안 허용할 이메일 발송 횟수 (회원가입 인증 + 비밀번호 재설정 각각) */
const MAX_PER_IP_PER_HOUR = 5
const WINDOW_MS = 60 * 60 * 1000 // 1시간

/**
 * Vercel/프록시 환경에서 클라이언트 IP 추출
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIp) return realIp.trim()
  return 'unknown'
}

export type EmailSendType = 'verification' | 'password_reset'

/**
 * IP 기준 이메일 발송 한도 초과 여부 확인
 * @returns 초과 시 true
 */
export async function isEmailRateLimitExceeded(
  db: Db,
  ip: string,
  type: EmailSendType
): Promise<boolean> {
  if (ip === 'unknown') return false // 로컬 등 IP 없으면 제한 없음 (개발 편의)
  const since = new Date(Date.now() - WINDOW_MS)
  const count = await db.collection(COLLECTION).countDocuments({
    ip,
    type,
    createdAt: { $gte: since },
  })
  return count >= MAX_PER_IP_PER_HOUR
}

/**
 * 이메일 발송 기록 (한도 체크용). 2시간 후 TTL로 자동 삭제됨.
 */
export async function recordEmailSend(
  db: Db,
  ip: string,
  type: EmailSendType
): Promise<void> {
  if (ip === 'unknown') return
  const now = new Date()
  await db.collection(COLLECTION).insertOne({
    ip,
    type,
    createdAt: now,
    expireAt: new Date(now.getTime() + 2 * WINDOW_MS), // TTL 인덱스용
  })
}
