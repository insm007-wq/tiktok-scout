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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'example@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // 입력값 검증
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
            console.warn(`[Auth] 사용자를 찾을 수 없음: ${email}`)
            return null
          }

          // 비밀번호 검증
          if (!user.password) {
            console.warn(`[Auth] 비밀번호 설정되지 않음: ${email}`)
            return null
          }

          const isPasswordValid = await verifyPassword(password, user.password)

          if (!isPasswordValid) {
            console.warn(`[Auth] 비밀번호 불일치: ${email}`)
            return null
          }

          // SMS 인증 확인 - 개발 중 비활성화
          // if (!user.isVerified) {
          //   return null
          // }

          // 관리자 승인 확인
          if (!user.isApproved) {
            console.warn(`[Auth] 승인 대기 중: ${email}`)
            throw new Error('PENDING_APPROVAL')
          }

          // 계정 차단 확인
          if (user.isBanned) {
            console.warn(`[Auth] 차단된 계정: ${email}`)
            return null
          }

          // 계정 비활성화 확인
          if (!user.isActive) {
            console.warn(`[Auth] 비활성화된 계정: ${email}`)
            return null
          }

          // 탈퇴한 계정 확인
          if (user.isWithdrawn) {
            console.warn(`[Auth] 탈퇴한 계정: ${email}`)
            return null
          }

          console.log(`[Auth] 로그인 성공: ${email}`)

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
          return null
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
      console.log(`[Auth Event] 사용자 로그인: ${user.email}`)
    },
  },
})
