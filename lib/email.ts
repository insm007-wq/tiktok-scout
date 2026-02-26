import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'onboarding@resend.dev'
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
