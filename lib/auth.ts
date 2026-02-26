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
    // 이메일 인증 완료 후 자동 로그인용
    Credentials({
      id: 'email-verify',
      name: 'EmailVerify',
      credentials: {
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        const token = credentials?.token as string | undefined
        if (!token) return null
        try {
          const { connectToDatabase } = await import('./mongodb')
          const { getUserById } = await import('./userLimits')
          const { db } = await connectToDatabase()
          const record = await db.collection('one_time_logins').findOne({
            token,
            expiresAt: { $gt: new Date() },
          })
          if (!record) return null
          await db.collection('one_time_logins').deleteOne({ token })
          const user = await getUserById(record.email)
          if (!user) return null
          return {
            id: user._id?.toString() || record.email,
            email: user.email,
            name: user.name,
            image: user.image,
            isAdmin: user.isAdmin || false,
            isApproved: user.isApproved || false,
            isVerified: user.isVerified || false,
            phone: user.phone,
          }
        } catch {
          return null
        }
      },
    }),
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'example@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.warn('[Auth] 이메일 또는 비밀번호 누락')
          return null
        }

        try {
          const email = credentials.email as string
          const password = credentials.password as string

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

          // 이메일 인증 여부 확인
          if (!user.isVerified) {
            console.warn('[Auth] 이메일 미인증')
            return {
              id: user._id?.toString() || email,
              email: user.email,
              name: user.name,
              image: user.image,
              isAdmin: user.isAdmin || false,
              isApproved: user.isApproved || false,
              isVerified: false,
              phone: user.phone,
              _error: 'EMAIL_NOT_VERIFIED',
            } as any
          }

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

          // ✨ 구독 만료 체크: subscriptions 컬렉션 기준
          if (!user.isAdmin) {
            const { connectToDatabase } = await import('./mongodb')
            const { db } = await connectToDatabase()
            const now = new Date()
            const subscription = await db.collection('subscriptions').findOne({ email })

            const isActive =
              subscription?.status === 'active' &&
              subscription?.currentPeriodEnd &&
              new Date(subscription.currentPeriodEnd) > now

            // 구독이 있었는데 만료된 경우에만 dailyLimit 0으로 초기화
            // 구독 기록이 없으면 무료 10회 회원가입 혜택 유지
            if (subscription && !isActive) {
              const currentLimit = user.dailyLimit ?? 0
              if (currentLimit > 0) {
                await db.collection('users').updateOne(
                  { email },
                  { $set: { dailyLimit: 0, remainingLimit: 0, updatedAt: now } }
                )
                console.warn(`[Auth] 구독 만료 - dailyLimit 초기화: ${maskEmail(email)}`)
              }
            }
          }

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
