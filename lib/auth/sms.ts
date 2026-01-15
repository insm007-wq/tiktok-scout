import 'server-only'
import crypto from 'crypto'

/**
 * Naver Cloud Platform SMS 인증 시스템
 */

interface SMSConfig {
  serviceId: string
  accessKey: string
  secretKey: string
  phoneNumber: string
}

interface SMSResponse {
  success: boolean
  messageId?: string
  error?: string
}

// SMS 인증 코드를 메모리에 저장 (실제로는 Redis 또는 DB 사용 권장)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>()

/**
 * 인증 코드 생성 (6자리 숫자)
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Naver Cloud Platform SMS API 호출
 * HMAC-SHA256 서명 필수
 */
async function callNaverSMSAPI(
  phoneNumber: string,
  verificationCode: string
): Promise<SMSResponse> {
  const config: SMSConfig = {
    serviceId: process.env.NCP_SERVICE_ID || '',
    accessKey: process.env.NCP_ACCESS_KEY || '',
    secretKey: process.env.NCP_SECRET_KEY || '',
    phoneNumber: process.env.NCP_PHONE_NUMBER || '',
  }

  // 환경변수 검증
  if (!config.serviceId || !config.accessKey || !config.secretKey || !config.phoneNumber) {
    console.error('[SMS] 필수 환경변수가 설정되지 않음')
    return { success: false, error: 'SMS 설정 오류' }
  }

  try {
    // 현재 시간 (밀리초)
    const timestamp = Date.now().toString()

    // HMAC-SHA256 서명 생성
    const message = `POST /sms/v2/services/${config.serviceId}/messages\n${timestamp}\n${config.accessKey}`
    const signature = crypto
      .createHmac('sha256', config.secretKey)
      .update(message)
      .digest('base64')

    // API 요청 바디
    const messageBody = {
      type: 'SMS',
      contentType: 'COMM',
      countryCode: '82',
      from: config.phoneNumber,
      content: `[TikTok Scout] 인증번호: ${verificationCode} (5분 내 입력)`,
      messages: [
        {
          to: phoneNumber,
        },
      ],
    }

    // API 호출
    const response = await fetch(
      `https://api.ncloud.com/sms/v2/services/${config.serviceId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ncp-apigw-timestamp': timestamp,
          'x-ncp-iam-access-key': config.accessKey,
          'x-ncp-apigw-signature-v2': signature,
        },
        body: JSON.stringify(messageBody),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('[SMS API 오류]', error)
      return { success: false, error: '문자 발송 실패' }
    }

    const result = await response.json()
    console.log('[SMS 발송 성공]', result)

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error) {
    console.error('[SMS 호출 실패]', error)
    return { success: false, error: '문자 발송 실패' }
  }
}

/**
 * SMS 인증 코드 발송
 * @param phoneNumber 핸드폰 번호 (01012345678 형식)
 * @returns 인증 코드 및 성공 여부
 */
export async function sendSMSVerification(phoneNumber: string): Promise<SMSResponse> {
  try {
    // 핸드폰 번호 형식 검증 (010-1234-5678 또는 01012345678)
    const cleanPhone = phoneNumber.replace(/-/g, '')
    if (!/^01[0-9]\d{7,8}$/.test(cleanPhone)) {
      return { success: false, error: '올바른 핸드폰 번호 형식이 아닙니다' }
    }

    // 인증 코드 생성
    const code = generateVerificationCode()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5분 만료

    // 메모리에 저장
    verificationCodes.set(cleanPhone, { code, expiresAt })

    // SMS API 호출
    const result = await callNaverSMSAPI(cleanPhone, code)

    if (!result.success) {
      verificationCodes.delete(cleanPhone)
    }

    console.log(`[SMS] ${cleanPhone}에 인증 코드 발송: ${code}`)

    return result
  } catch (error) {
    console.error('[sendSMSVerification 오류]', error)
    return { success: false, error: '요청 처리 중 오류가 발생했습니다' }
  }
}

/**
 * SMS 인증 코드 검증
 * @param phoneNumber 핸드폰 번호
 * @param code 사용자가 입력한 코드
 * @returns 검증 성공 여부
 */
export function verifySMSCode(phoneNumber: string, code: string): boolean {
  try {
    const cleanPhone = phoneNumber.replace(/-/g, '')
    const stored = verificationCodes.get(cleanPhone)

    // 저장된 코드 없음
    if (!stored) {
      console.warn(`[SMS] 검증 코드 없음: ${cleanPhone}`)
      return false
    }

    // 만료 시간 초과
    if (Date.now() > stored.expiresAt) {
      console.warn(`[SMS] 검증 코드 만료: ${cleanPhone}`)
      verificationCodes.delete(cleanPhone)
      return false
    }

    // 코드 일치 여부 확인
    const isValid = stored.code === code

    if (isValid) {
      console.log(`[SMS] 검증 성공: ${cleanPhone}`)
      verificationCodes.delete(cleanPhone)
    } else {
      console.warn(`[SMS] 검증 실패: ${cleanPhone} (입력: ${code}, 정답: ${stored.code})`)
    }

    return isValid
  } catch (error) {
    console.error('[verifySMSCode 오류]', error)
    return false
  }
}

/**
 * 검증 코드 상태 확인 (테스트용)
 */
export function getVerificationStatus(phoneNumber: string): { exists: boolean; expiresIn: number } {
  const cleanPhone = phoneNumber.replace(/-/g, '')
  const stored = verificationCodes.get(cleanPhone)

  if (!stored) {
    return { exists: false, expiresIn: 0 }
  }

  const expiresIn = Math.max(0, stored.expiresAt - Date.now())

  return {
    exists: expiresIn > 0,
    expiresIn: Math.ceil(expiresIn / 1000), // 초 단위
  }
}

/**
 * 오래된 검증 코드 정리 (5분마다 실행 권장)
 */
export function cleanupExpiredCodes(): number {
  const now = Date.now()
  let deleted = 0

  for (const [phone, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(phone)
      deleted++
    }
  }

  if (deleted > 0) {
    console.log(`[SMS] ${deleted}개의 만료된 검증 코드 삭제됨`)
  }

  return deleted
}
