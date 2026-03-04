import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// 운영에서는 반드시 본인 도메인의 발신 주소를 사용하세요 (예: no-reply@your-domain.com)
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev'
const APP_NAME = '틱톡 킬라'

function getBaseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${getBaseUrl()}/api/auth/verify-email?token=${token}`

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `[${APP_NAME}] 이메일 인증을 완료해주세요`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #10b981, #06b6d4); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff;">${APP_NAME}</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">이메일 인증</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">안녕하세요!</p>
          <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">
            ${APP_NAME} 회원가입을 위한 이메일 인증입니다.<br />
            아래 버튼을 클릭하여 인증을 완료하면 회원가입이 완료됩니다.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}"
               style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981, #06b6d4); color: #000000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
              이메일 인증하기
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            이 링크는 <strong style="color: #9ca3af;">24시간</strong> 동안 유효합니다.<br />
            본인이 가입하지 않으셨다면 이 이메일을 무시해주세요.
          </p>
          <hr style="border: none; border-top: 1px solid #1f2937; margin: 24px 0;" />
          <p style="color: #4b5563; font-size: 12px;">
            버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br />
            <span style="color: #06b6d4; word-break: break-all;">${verifyUrl}</span>
          </p>
        </div>
        <div style="background: #111111; padding: 16px 24px; text-align: center;">
          <p style="color: #4b5563; font-size: 12px; margin: 0;">${APP_NAME} © 2025. All rights reserved.</p>
        </div>
      </div>
    `,
  })
}

/** 6자리 비밀번호 재설정 코드 발송 */
export async function sendPasswordResetCodeEmail(email: string, code: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `[${APP_NAME}] 비밀번호 재설정 코드`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #ec4899, #06b6d4); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff;">${APP_NAME}</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">비밀번호 재설정</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">비밀번호 재설정을 요청하셨습니다.</p>
          <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">아래 인증 코드를 입력해주세요.</p>
          <div style="text-align: center; margin: 24px 0; padding: 24px; background: #1f2937; border-radius: 12px;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #ec4899;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px;">인증 코드는 <strong style="color: #9ca3af;">5분</strong>간 유효합니다.</p>
          <p style="color: #4b5563; font-size: 12px; margin-top: 16px;">본인이 요청하지 않으셨다면 이 이메일을 무시해주세요.</p>
        </div>
      </div>
    `,
  })
}

/** 6자리 인증 코드 발송 (회원가입 폼용) */
export async function sendVerificationCodeEmail(email: string, code: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `[${APP_NAME}] 이메일 인증 코드`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #10b981, #06b6d4); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff;">${APP_NAME}</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">이메일 인증</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">회원가입을 위한 인증 코드입니다.</p>
          <div style="text-align: center; margin: 24px 0; padding: 24px; background: #1f2937; border-radius: 12px;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #10b981;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px;">인증 코드는 <strong style="color: #9ca3af;">5분</strong>간 유효합니다.</p>
        </div>
      </div>
    `,
  })
}

/** 결제 완료 이메일 (최초 구독 + 자동 갱신 공통) */
export async function sendBillingSuccessEmail(
  email: string,
  params: {
    planName: string
    amount: number
    periodEnd: string   // YYYY-MM-DD
    isRenewal?: boolean
  }
) {
  const { planName, amount, periodEnd, isRenewal = false } = params
  const title = isRenewal ? '구독이 갱신되었습니다' : '구독이 시작되었습니다'
  const subtitle = isRenewal ? '자동 갱신 완료' : '구독 시작'
  const amountFormatted = amount.toLocaleString('ko-KR')

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `[${APP_NAME}] ${isRenewal ? '구독 자동 갱신' : '구독 시작'} 완료`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #10b981, #06b6d4); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: 0.03em;">${APP_NAME}</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px; letter-spacing: 0.02em;">${subtitle}</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #d1d5db; font-size: 16px; line-height: 1.7; letter-spacing: 0.02em;">${title}</p>
          <div style="background: #1f2937; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">플랜</span>
              <span style="color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.02em;">${planName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">결제 금액</span>
              <span style="color: #10b981; font-size: 14px; font-weight: 700; letter-spacing: 0.05em;">₩ ${amountFormatted}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">다음 결제일</span>
              <span style="color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.02em;">${periodEnd}</span>
            </div>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.7; letter-spacing: 0.02em;">
            감사합니다. ${APP_NAME}를 즐겁게 이용해 주세요!
          </p>
        </div>
        <div style="background: #111111; padding: 16px 24px; text-align: center;">
          <p style="color: #4b5563; font-size: 12px; margin: 0;">${APP_NAME} © 2025. All rights reserved.</p>
        </div>
      </div>
    `,
  })
}

/** 결제 실패 이메일 (자동 갱신 실패 시) */
export async function sendBillingFailureEmail(
  email: string,
  params: {
    planName: string
    failCount: number
    serviceUntil?: string  // 3회 실패 시 undefined (즉시 중단)
  }
) {
  const { planName, failCount, serviceUntil } = params
  const isFinal = failCount >= 3
  const title = isFinal
    ? '구독이 정지되었습니다'
    : `결제 실패 (${failCount}회차)`
  const subtitle = isFinal ? '서비스 이용 중단' : '결제 실패 알림'
  const bodyText = isFinal
    ? `결제가 ${failCount}회 연속 실패하여 구독 서비스가 정지되었습니다. 카드 정보를 확인하고 다시 구독해 주세요.`
    : `${planName} 플랜 자동 갱신 결제가 실패했습니다. ${serviceUntil ? `${serviceUntil}까지 서비스를 계속 이용하실 수 있으며, ` : ''}결제 수단을 확인해 주세요.`

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `[${APP_NAME}] ${isFinal ? '구독 서비스 정지' : `결제 실패 알림 (${failCount}회차)`}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff;">${APP_NAME}</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">${subtitle}</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #f87171; font-size: 16px; font-weight: 700;">${title}</p>
          <div style="background: #1f2937; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">플랜</span>
              <span style="color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.02em;">${planName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">실패 횟수</span>
              <span style="color: #f87171; font-size: 14px; font-weight: 700; letter-spacing: 0.02em;">${failCount}회</span>
            </div>
            ${serviceUntil ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">서비스 이용 가능일</span>
              <span style="color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.02em;">${serviceUntil}까지</span>
            </div>` : ''}
          </div>
          <p style="color: #d1d5db; font-size: 14px; line-height: 1.6;">${bodyText}</p>
        </div>
        <div style="background: #111111; padding: 16px 24px; text-align: center;">
          <p style="color: #4b5563; font-size: 12px; margin: 0;">${APP_NAME} © 2025. All rights reserved.</p>
        </div>
      </div>
    `,
  })
}

/** 구독 취소 확인 이메일 */
export async function sendCancelConfirmEmail(
  email: string,
  params: {
    planName: string
    serviceUntil: string  // YYYY-MM-DD
  }
) {
  const { planName, serviceUntil } = params

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `[${APP_NAME}] 구독 취소 확인`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6b7280, #4b5563); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff;">${APP_NAME}</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">구독 취소</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">구독이 취소되었습니다.</p>
          <div style="background: #1f2937; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">취소된 플랜</span>
              <span style="color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.02em;">${planName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">서비스 이용 가능일</span>
              <span style="color: #10b981; font-size: 14px; font-weight: 700; letter-spacing: 0.02em;">${serviceUntil}까지</span>
            </div>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            이용 기간이 끝나면 자동으로 서비스가 종료됩니다.<br />
            언제든지 다시 구독하실 수 있습니다.
          </p>
        </div>
        <div style="background: #111111; padding: 16px 24px; text-align: center;">
          <p style="color: #4b5563; font-size: 12px; margin: 0;">${APP_NAME} © 2025. All rights reserved.</p>
        </div>
      </div>
    `,
  })
}

/** 결제 3일 전 사전 고지 이메일 */
export async function sendBillingReminderEmail(
  email: string,
  params: {
    planName: string
    amount: number
    billingDate: string  // YYYY-MM-DD
    cardLast4?: string   // "1234"
  }
) {
  const { planName, amount, billingDate, cardLast4 } = params
  const amountFormatted = amount.toLocaleString('ko-KR')

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `[${APP_NAME}] 3일 후 구독 결제 예정 안내`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff;">${APP_NAME}</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">결제 예정 안내</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">
            3일 후 구독이 자동으로 갱신될 예정입니다.
          </p>
          <div style="background: #1f2937; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">플랜</span>
              <span style="color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.02em;">${planName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">결제 예정 금액</span>
              <span style="color: #f59e0b; font-size: 14px; font-weight: 700; letter-spacing: 0.05em;">₩ ${amountFormatted}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${cardLast4 ? '12px' : '0'}; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">결제 예정일</span>
              <span style="color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.02em;">${billingDate}</span>
            </div>
            ${cardLast4 ? `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
              <span style="color: #6b7280; font-size: 14px; letter-spacing: 0.02em;">결제 카드</span>
              <span style="color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.02em;">**** ${cardLast4}</span>
            </div>` : ''}
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            구독을 원하지 않으시면 결제일 전까지 취소해 주세요.
          </p>
        </div>
        <div style="background: #111111; padding: 16px 24px; text-align: center;">
          <p style="color: #4b5563; font-size: 12px; margin: 0;">${APP_NAME} © 2025. All rights reserved.</p>
        </div>
      </div>
    `,
  })
}
