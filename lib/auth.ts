import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { verifyPassword } from './auth/password'
import { getUserById } from './userLimits'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name?: string
    image?: string
    isAdmin: boolean
    isApproved: boolean
    isVerified: boolean
    phone?: string
  }

  interface Session {
    user: User
  }
}

// 로그에서 PII(개인정보) 보호: 이메일 마스킹
function maskEmail(email: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex <= 2) return email // 너무 짧으면 마스킹 안 함
  return email.substring(0, 2) + '***' + email.substring(atIndex)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'example@example.com' },
        password: { label: 'Password', type: 'password' },
        accessCode: { label: 'Access Code', type: 'text' },
      },
      async authorize(credentials) {
        // 입력값 검증 - accessCode는 선택사항
        if (!credentials?.email || !credentials?.password) {
          console.warn('[Auth] 이메일 또는 비밀번호 누락')
          return null
        }

        try {
          const email = credentials.email as string
          const password = credentials.password as string
          const accessCode = (credentials.accessCode as string || '').trim().toUpperCase()

          // 사용자 조회
          const user = await getUserById(email)

          if (!user) {
            console.warn('[Auth] 사용자를 찾을 수 없음')
            return {
              id: email,
              email: email,
              name: undefined,
              image: undefined,
              isAdmin: false,
              isApproved: false,
              isVerified: false,
              phone: undefined,
              _error: 'CredentialsSignin',
            } as any
          }

          // 비밀번호 검증
          if (!user.password) {
            console.warn('[Auth] 비밀번호 설정되지 않음')
            return null
          }

          const isPasswordValid = await verifyPassword(password, user.password)

          if (!isPasswordValid) {
            console.warn('[Auth] 비밀번호 불일치')
            return {
              id: user._id?.toString() || email,
              email: user.email,
              name: user.name,
              image: user.image,
              isAdmin: user.isAdmin || false,
              isApproved: user.isApproved || false,
              isVerified: user.isVerified || false,
              phone: user.phone,
              _error: 'CredentialsSignin',
            } as any
          }

          // SMS 인증 확인 - 개발 중 비활성화
          // if (!user.isVerified) {
          //   return null
          // }

          // 관리자 승인 확인
          if (!user.isApproved) {
            console.warn('[Auth] 승인 대기 중')
            return {
              id: user._id?.toString() || email,
              email: user.email,
              name: user.name,
              image: user.image,
              isAdmin: user.isAdmin || false,
              isApproved: user.isApproved || false,
              isVerified: user.isVerified || false,
              phone: user.phone,
              _error: 'PENDING_APPROVAL',
            } as any
          }

          // 계정 차단 확인
          if (user.isBanned) {
            console.warn('[Auth] 차단된 계정')
            return {
              id: user._id?.toString() || email,
              email: user.email,
              name: user.name,
              image: user.image,
              isAdmin: user.isAdmin || false,
              isApproved: user.isApproved || false,
              isVerified: user.isVerified || false,
              phone: user.phone,
              _error: 'ACCOUNT_BANNED',
            } as any
          }

          // 계정 비활성화 확인
          if (!user.isActive) {
            console.warn('[Auth] 비활성화된 계정')
            return {
              id: user._id?.toString() || email,
              email: user.email,
              name: user.name,
              image: user.image,
              isAdmin: user.isAdmin || false,
              isApproved: user.isApproved || false,
              isVerified: user.isVerified || false,
              phone: user.phone,
              _error: 'ACCOUNT_DISABLED',
            } as any
          }

          // 탈퇴한 계정 확인
          if (user.isWithdrawn) {
            console.warn('[Auth] 탈퇴한 계정')
            return {
              id: user._id?.toString() || email,
              email: user.email,
              name: user.name,
              image: user.image,
              isAdmin: user.isAdmin || false,
              isApproved: user.isApproved || false,
              isVerified: user.isVerified || false,
              phone: user.phone,
              _error: 'ACCOUNT_WITHDRAWN',
            } as any
          }

          // ✨ 사용자별 만료 기간으로 동적 체크
          let isExpired = false

          if (user.hasAccessCode && user.accessCodeUsedAt) {
            // expiryDays가 없으면 기본값 30일 사용
            const expiryDays = user.expiryDays || 30
            const expiryMs = expiryDays * 24 * 60 * 60 * 1000
            const elapsedMs = Date.now() - new Date(user.accessCodeUsedAt).getTime()
            isExpired = elapsedMs > expiryMs

            // 만료 시 hasAccessCode를 false로 재설정
            if (isExpired) {
              console.warn(`[Auth] 접근 코드 만료됨 (${expiryDays}일 경과)`)
              const { connectToDatabase } = await import('./mongodb')
              const { db } = await connectToDatabase()
              await db.collection('users').updateOne(
                { email },
                {
                  $set: {
                    hasAccessCode: false,
                    updatedAt: new Date()
                  }
                }
              )
              user.hasAccessCode = false
            }
          }

          // 접근 코드 검증 로직
          if (!user.hasAccessCode) {
            // 첫 로그인: 접근 코드 필수 (초대 코드가 설정되지 않은 신규 사용자)
            if (!accessCode) {
              console.warn('[Auth] 접근 코드 필요')
              const errorCode = isExpired ? 'ACCESS_CODE_EXPIRED' : 'ACCESS_CODE_REQUIRED'
              return {
                id: user._id?.toString() || email,
                email: user.email,
                name: user.name,
                image: user.image,
                isAdmin: user.isAdmin || false,
                isApproved: user.isApproved || false,
                isVerified: user.isVerified || false,
                phone: user.phone,
                _error: errorCode,
              } as any
            }

            // 첫 로그인 시 접근 코드 검증 (DONBOK 또는 FORMNA)
            if (accessCode !== 'DONBOK' && accessCode !== 'FORMNA') {
              console.warn('[Auth] 유효하지 않은 접근 코드')
              return {
                id: user._id?.toString() || email,
                email: user.email,
                name: user.name,
                image: user.image,
                isAdmin: user.isAdmin || false,
                isApproved: user.isApproved || false,
                isVerified: user.isVerified || false,
                phone: user.phone,
                _error: 'INVALID_ACCESS_CODE',
              } as any
            }

            // 첫 로그인 성공: expiryDays 설정
            const expiryDays = accessCode === 'DONBOK' ? 90 : 30
            const planType = accessCode === 'DONBOK' ? '프리미엄 90일' : '스탠다드 30일'

            const { connectToDatabase } = await import('./mongodb')
            const { db } = await connectToDatabase()
            await db.collection('users').updateOne(
              { email },
              {
                $set: {
                  hasAccessCode: true,
                  accessCodeUsedAt: new Date(),
                  expiryDays,
                  updatedAt: new Date(),
                },
              }
            )
            console.log(`[Auth] ✓ 접근 코드 인증 완료: ${maskEmail(email)} (${planType})`)
          } else if (accessCode) {
            // 이후 로그인: 코드가 입력되었으면 업그레이드/다운그레이드 검증

            // 1. 유효한 코드인지 확인
            if (accessCode !== 'DONBOK' && accessCode !== 'FORMNA') {
              console.warn('[Auth] 유효하지 않은 접근 코드')
              return {
                id: user._id?.toString() || email,
                email: user.email,
                name: user.name,
                image: user.image,
                isAdmin: user.isAdmin || false,
                isApproved: user.isApproved || false,
                isVerified: user.isVerified || false,
                phone: user.phone,
                _error: 'INVALID_ACCESS_CODE',
              } as any
            }

            // 2. 새 코드의 expiryDays 계산
            const newExpiryDays = accessCode === 'DONBOK' ? 90 : 30
            const currentExpiryDays = user.expiryDays || 30

            // 3. 업그레이드/다운그레이드 판단
            if (newExpiryDays > currentExpiryDays) {
              // 업그레이드: 허용
              const { connectToDatabase } = await import('./mongodb')
              const { db } = await connectToDatabase()

              // 7일 대기 기간 확인과 업데이트를 원자적으로 처리
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              const updateResult = await db.collection('users').findOneAndUpdate(
                {
                  email,
                  $or: [
                    { lastCodeEnteredAt: { $exists: false } }, // 기록 없음
                    { lastCodeEnteredAt: { $lte: sevenDaysAgo } } // 7일 이상 경과
                  ]
                },
                {
                  $set: {
                    expiryDays: newExpiryDays,
                    accessCodeUsedAt: new Date(), // 기간 갱신
                    lastCodeEnteredAt: new Date(), // 코드 입력 시간 갱신
                    updatedAt: new Date(),
                  },
                },
                { returnDocument: 'after' }
              )

              if (!updateResult) {
                // 조건 미충족: 7일이 지나지 않았음
                const timeSinceLastEntry = Date.now() - new Date(user.lastCodeEnteredAt!).getTime()
                const remainingDays = Math.ceil((7 * 24 * 60 * 60 * 1000 - timeSinceLastEntry) / (24 * 60 * 60 * 1000))
                console.warn(`[Auth] 코드 입력 대기 기간 확인: ${maskEmail(email)} (${remainingDays}일 후 가능)`)
                return {
                  id: user._id?.toString() || email,
                  email: user.email,
                  name: user.name,
                  image: user.image,
                  isAdmin: user.isAdmin || false,
                  isApproved: user.isApproved || false,
                  isVerified: user.isVerified || false,
                  phone: user.phone,
                  _error: 'CODE_UPGRADE_COOLDOWN',
                } as any
              }

              const planType = accessCode === 'DONBOK' ? '프리미엄 90일' : '스탠다드 30일'
              console.log(`[Auth] ✓ 코드 업그레이드: ${maskEmail(email)} (${currentExpiryDays}일 → ${newExpiryDays}일)`)

            } else if (newExpiryDays < currentExpiryDays) {
              // 다운그레이드: 거부
              console.warn(`[Auth] 코드 다운그레이드 시도: ${maskEmail(email)} (${currentExpiryDays}일 → ${newExpiryDays}일)`)
              return {
                id: user._id?.toString() || email,
                email: user.email,
                name: user.name,
                image: user.image,
                isAdmin: user.isAdmin || false,
                isApproved: user.isApproved || false,
                isVerified: user.isVerified || false,
                phone: user.phone,
                _error: 'CODE_DOWNGRADE_NOT_ALLOWED',
              } as any

            } else {
              // 동일한 코드: 이미 등록됨
              console.warn(`[Auth] 코드 중복 입력 시도: ${maskEmail(email)} (${currentExpiryDays}일 이미 등록됨)`)
              return {
                id: user._id?.toString() || email,
                email: user.email,
                name: user.name,
                image: user.image,
                isAdmin: user.isAdmin || false,
                isApproved: user.isApproved || false,
                isVerified: user.isVerified || false,
                phone: user.phone,
                _error: 'CODE_ALREADY_USED',
              } as any
            }
          }
          // hasAccessCode: true이고 accessCode가 없는 경우 → 코드 검증 생략 (이전 코드의 유효 기간 내)

          console.log('[Auth] 로그인 성공')

          return {
            id: user._id?.toString() || email,
            email: user.email,
            name: user.name,
            image: user.image,
            isAdmin: user.isAdmin || false,
            isApproved: user.isApproved || false,
            isVerified: user.isVerified || false,
            phone: user.phone,
          }
        } catch (error) {
          console.error('[Auth] 인증 중 오류:', error)
          throw error
        }
      },
    }),
  ],

  logger: {
    error(error) {
      // 로그인 실패는 간단하게만 로깅 (정상 동작)
      if (error.name === 'CredentialsSignin') {
        console.warn('[Auth] 로그인 실패 - 잘못된 자격 증명')
        return
      }

      // 실제 에러는 상세하게 로깅
      console.error(`[Auth Error] ${error.name}: ${error.message}`)
      if (error.stack) {
        console.error(error.stack)
      }
    },
    warn(code) {
      console.warn(`[Auth Warning] ${code}`)
    },
    debug(message, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Auth Debug]', message, metadata)
      }
    },
  },

  callbacks: {
    async signIn({ user }) {
      // _error 필드가 있으면 로그인은 진행하되, 토큰에 에러 정보 저장
      if ((user as any)._error) {
        const errorCode = (user as any)._error
        console.log(`[Auth] signIn 콜백: 에러 감지 - ${errorCode}`)
      }
      return true
    },

    async jwt({ token, user, trigger, session }) {
      // 초기 로그인
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
        token.isAdmin = user.isAdmin
        token.isApproved = user.isApproved
        token.isVerified = user.isVerified
        token.phone = user.phone
        // _error가 있으면 토큰에 저장
        if ((user as any)._error) {
          (token as any)._error = (user as any)._error
        }
      }

      // 세션 업데이트 시 (update 호출)
      if (trigger === 'update' && session) {
        token.isApproved = session.isApproved
        token.isVerified = session.isVerified
        token.isAdmin = session.isAdmin
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string | undefined
        session.user.image = token.image as string | undefined
        session.user.isAdmin = token.isAdmin as boolean
        session.user.isApproved = token.isApproved as boolean
        session.user.isVerified = token.isVerified as boolean
        session.user.phone = token.phone as string | undefined
      }
      // _error가 있으면 session에 노출
      if ((token as any)._error) {
        (session as any)._error = (token as any)._error
      }
      return session
    },
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
    updateAge: 24 * 60 * 60, // 1일마다 갱신
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30일
  },

  // 쿠키 설정
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('[Auth Event] 사용자 로그인')
    },
  },
})
