import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Kakao from 'next-auth/providers/kakao'
import Naver from 'next-auth/providers/naver'
import { upsertUser, getUserById } from './lib/userLimits'

export const runtime = 'nodejs'

const secret = process.env.NEXTAUTH_SECRET

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: secret,
  trustHost: true,
  basePath: '/api/auth',
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
    }),
    Naver({
      clientId: process.env.AUTH_NAVER_ID,
      clientSecret: process.env.AUTH_NAVER_SECRET,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name: 'authjs.session-token',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      },
    },
  },
  callbacks: {
    // ✅ 로그인 전 차단 여부 확인 (이메일 검증 강화)
    async signIn({ user, account }: any) {
      if (!account?.providerAccountId) return false

      try {
        // 제공자별 이메일 추출
        let email = user.email || ''
        if (account.provider === 'kakao' && !email) {
          email = user.kakao_account?.email || user.kakao_account?.account_email || ''
        }

        // ✅ 이메일 필수 검증 강화
        if (!email || email.trim() === '') {
          console.error('❌ 이메일 없음:', {
            provider: account.provider,
            timestamp: new Date().toISOString()
          })
          return '/login?error=NoEmail'
        }

        // 사용자 조회
        const dbUser = await getUserById(email)

        // ✅ 차단된 사용자는 로그인 거부
        if (dbUser?.isBanned) {
          console.warn(`❌ 차단된 사용자 로그인 시도: ${email}`)
          return '/login?error=BannedUser'
        }

        // ✅ 비활성 사용자도 로그인 거부
        if (dbUser && !dbUser.isActive) {
          console.warn(`⚠️ 비활성 사용자 로그인 시도: ${email}`)
          return '/login?error=InactiveUser'
        }

        return true
      } catch (error) {
        console.error('❌ signIn 콜백 에러:', {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        })
        // ✅ 에러 시 차단 (로그인 진행하지 않음)
        return '/login?error=AuthFailed'
      }
    },

    async jwt({ token, user, account }: any) {
      // OAuth provider의 영구적인 고유 ID 사용 (로그인할 때마다 동일)
      if (account?.providerAccountId) {
        token.id = `${account.provider}:${account.providerAccountId}`

        // 🔥 로그인 시 사용자 정보를 MongoDB에 저장 (재시도 로직 포함)
        try {
          // ✅ 재시도 로직 (최대 3회) - 이메일 추출과 upsertUser 모두 포함
          let retries = 3
          let lastError: any
          let email = ''

          while (retries > 0) {
            try {
              // 제공자별 이메일 추출 (재시도 루프 내부)
              email = user.email || ''
              if (account.provider === 'kakao' && !email) {
                email = user.kakao_account?.email || user.kakao_account?.account_email || ''
              }

              // ✅ 이메일 필수 검증
              if (!email || email.trim() === '') {
                throw new Error('EMAIL_REQUIRED')
              }

              // 사용자 정보를 MongoDB에 저장
              await upsertUser(
                email,
                user.name,
                user.image,
                account.provider,
                account.providerAccountId
              )
              console.log(`✅ 사용자 저장 성공: ${email}`)
              break // 성공 시 루프 탈출
            } catch (error) {
              lastError = error
              retries--
              if (retries > 0) {
                const errorMsg = error instanceof Error ? error.message : String(error)
                console.warn(`⚠️ 사용자 저장 실패 (재시도 ${3 - retries}/3): ${email || 'unknown'}, error: ${errorMsg}`)
                // 1초 대기 후 재시도
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
            }
          }

          // 3회 모두 실패 → 로그인 차단
          if (retries === 0) {
            console.error('❌ 사용자 저장 최종 실패:', {
              email: email || 'unknown',
              provider: account.provider,
              error: lastError instanceof Error ? lastError.message : String(lastError),
              timestamp: new Date().toISOString()
            })
            throw new Error('USER_CREATION_FAILED')
          }
        } catch (error) {
          // ✅ 프로덕션에서도 에러 로그 출력
          console.error('❌ JWT 콜백 에러 - 로그인 차단:', {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          })
          // NextAuth가 처리하도록 에러 throw
          throw error
        }
      }
      if (user) {
        token.email = user.email
        token.name = user.name
        token.image = user.image
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.image = token.image as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        // provider 정보 추가 (OAuth 제공자별 색상 표시용)
        session.user.provider = token.id?.split(':')[0] || undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
