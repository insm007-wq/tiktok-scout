import { z } from 'zod'

/**
 * Step 1: 기본 정보 검증 스키마
 */
export const infoSchema = z
  .object({
    name: z.string().min(2, '이름은 2자 이상이어야 합니다').max(50, '이름은 50자 이하여야 합니다'),

    email: z.string().email('올바른 이메일 형식이 아닙니다'),

    phone: z
      .string()
      .regex(
        /^01[0-9][-]?\d{3,4}[-]?\d{4}$/,
        '올바른 핸드폰 번호 형식이 아닙니다 (예: 010-1234-5678)'
      ),

    password: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다')
      .max(50, '비밀번호는 50자 이하여야 합니다')
      .regex(/[a-z]/, '소문자를 포함해야 합니다')
      .regex(/[0-9]/, '숫자를 포함해야 합니다')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, '특수문자를 포함해야 합니다'),

    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['passwordConfirm'],
  })

export type InfoFormData = z.infer<typeof infoSchema>

/**
 * Step 2: 주소 검증 스키마
 */
export const addressSchema = z.object({
  zipCode: z.string().min(5, '우편번호를 입력해주세요').max(6, '우편번호 형식이 올바르지 않습니다'),
  address: z.string().min(5, '주소를 입력해주세요'),
  detailAddress: z.string().min(1, '상세주소를 입력해주세요'),
})

export type AddressFormData = z.infer<typeof addressSchema>

/**
 * Step 3: 동의 검증 스키마
 */
export const consentSchema = z
  .object({
    termsConsent: z.boolean(),
    marketingConsent: z.boolean(),
  })
  .refine((data) => data.termsConsent === true, {
    message: '약관 동의는 필수입니다',
    path: ['termsConsent'],
  })
  .refine((data) => data.marketingConsent === true, {
    message: '마케팅 활용 동의는 필수입니다',
    path: ['marketingConsent'],
  })

export type ConsentFormData = z.infer<typeof consentSchema>

/**
 * 회원가입 폼 검증 스키마 (전체)
 */
export const signupSchema = z
  .object({
    name: z.string().min(2, '이름은 2자 이상이어야 합니다').max(50, '이름은 50자 이하여야 합니다'),

    email: z.string().email('올바른 이메일 형식이 아닙니다'),

    phone: z
      .string()
      .regex(
        /^01[0-9][-]?\d{3,4}[-]?\d{4}$/,
        '올바른 핸드폰 번호 형식이 아닙니다 (예: 010-1234-5678)'
      ),

    password: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다')
      .max(50, '비밀번호는 50자 이하여야 합니다')
      .regex(/[a-z]/, '소문자를 포함해야 합니다')
      .regex(/[0-9]/, '숫자를 포함해야 합니다')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, '특수문자를 포함해야 합니다'),

    passwordConfirm: z.string(),

    address: addressSchema,

    marketingConsent: z.boolean(),

    termsConsent: z.boolean(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['passwordConfirm'],
  })
  .refine((data) => data.termsConsent === true, {
    message: '약관 동의는 필수입니다',
    path: ['termsConsent'],
  })
  .refine((data) => data.marketingConsent === true, {
    message: '마케팅 활용 동의는 필수입니다',
    path: ['marketingConsent'],
  })

export type SignupFormData = z.infer<typeof signupSchema>

/**
 * 로그인 폼 검증 스키마
 */
export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
  rememberMe: z.boolean().optional().default(false),
})

export type LoginFormData = z.infer<typeof loginSchema>

/**
 * 비밀번호 강도 체크 함수
 */
export function getPasswordStrength(password: string): {
  score: number
  level: 'weak' | 'fair' | 'good' | 'strong'
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1

  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('소문자를 포함해주세요')
  }

  if (/[0-9]/.test(password)) {
    score += 1
  } else {
    feedback.push('숫자를 포함해주세요')
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1
  } else {
    feedback.push('특수문자를 포함해주세요')
  }

  let level: 'weak' | 'fair' | 'good' | 'strong' = 'weak'
  if (score >= 4) level = 'fair'
  if (score >= 5) level = 'good'
  if (score >= 6) level = 'strong'

  return { score, level, feedback }
}
