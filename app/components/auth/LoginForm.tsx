'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, signOut, getSession } from 'next-auth/react'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  })

  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [showAccessCodeField, setShowAccessCodeField] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // URL의 error 파라미터 확인 (페이지 로드 시)
  useEffect(() => {
    const errorParam = searchParams?.get('error')
    if (errorParam) {
      if (errorParam === 'CredentialsSignin') {
        setError('아이디 또는 비밀번호를 확인해주세요.')
      } else if (errorParam === 'ACCESS_CODE_REQUIRED') {
        setShowAccessCodeField(true)
        setError('접근 코드를 입력해주세요. (DONBOK: 90일 프리미엄, FORMAN: 30일)')
      } else if (errorParam === 'ACCESS_CODE_EXPIRED') {
        setShowAccessCodeField(true)
        setError('사용 기간이 만료되었습니다. 접근 코드를 입력하거나 유료 결제를 진행해주세요.')
      } else if (errorParam === 'INVALID_ACCESS_CODE') {
        setShowAccessCodeField(true)
        setError('유효하지 않은 접근 코드입니다.')
      } else if (errorParam === 'PENDING_APPROVAL') {
        setError('승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다.')
      } else if (errorParam === 'SMS_NOT_VERIFIED') {
        setError('SMS 인증을 완료해주세요.')
      } else if (errorParam === 'ACCOUNT_BANNED') {
        setError('차단된 계정입니다. 관리자에게 문의하세요.')
      } else if (errorParam === 'ACCOUNT_DISABLED') {
        setError('비활성화된 계정입니다.')
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    // 폼 검증
    const result = loginSchema.safeParse(formData)

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as any)
      return
    }

    setLoading(true)

    try {
      // NextAuth signIn 호출 (accessCode는 선택사항)
      const response = await signIn('credentials', {
        email: result.data.email,
        password: result.data.password,
        accessCode: accessCode.trim() || '', // 빈 문자열도 허용
        redirect: false,
      })

      if (!response?.ok) {
        // response?.url에서 에러 파라미터 추출 (signIn 콜백에서 리다이렉트 경로를 반환한 경우)
        const errorFromUrl = response?.url ? new URL(response.url, window.location.origin).searchParams.get('error') : null
        const errorCode = errorFromUrl || response?.error

        // 에러 코드에 따라 메시지 분리
        if (errorCode === 'ACCESS_CODE_REQUIRED') {
          setShowAccessCodeField(true)
          setError('접근 코드를 입력해주세요. (DONBOK: 90일 프리미엄, FORMAN: 30일)')
          return
        } else if (errorCode === 'ACCESS_CODE_EXPIRED') {
          setShowAccessCodeField(true)
          setError('사용 기간이 만료되었습니다. 접근 코드를 입력하거나 유료 결제를 진행해주세요.')
          return
        } else if (errorCode === 'INVALID_ACCESS_CODE') {
          setShowAccessCodeField(true)
          setError('유효하지 않은 접근 코드입니다.')
          return
        } else if (errorCode === 'PENDING_APPROVAL') {
          setError('승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다.')
        } else if (errorCode === 'SMS_NOT_VERIFIED') {
          setError('SMS 인증을 완료해주세요.')
        } else if (errorCode === 'ACCOUNT_BANNED') {
          setError('차단된 계정입니다. 관리자에게 문의하세요.')
        } else if (errorCode === 'ACCOUNT_DISABLED') {
          setError('비활성화된 계정입니다.')
        } else if (errorCode === 'INVALID_CREDENTIALS' || errorCode === 'CredentialsSignin') {
          setError('아이디 또는 비밀번호를 확인해주세요.')
        } else {
          setError(`로그인 실패: ${errorCode || '알 수 없는 오류'}`)
        }
        return
      }

      // 로그인 성공 → session에서 _error 확인
      const session = await getSession()
      const sessionError = (session as any)?._error

      if (sessionError === 'ACCESS_CODE_REQUIRED') {
        // 접근 코드가 필요한 경우
        await signOut({ redirect: false })
        setShowAccessCodeField(true)
        setError('접근 코드를 입력해주세요. (DONBOK: 90일 프리미엄, FORMAN: 30일)')
        return
      } else if (sessionError === 'ACCESS_CODE_EXPIRED') {
        // 접근 코드가 만료된 경우
        await signOut({ redirect: false })
        setShowAccessCodeField(true)
        setError('사용 기간이 만료되었습니다. 접근 코드를 입력하거나 유료 결제를 진행해주세요.')
        return
      } else if (sessionError === 'INVALID_ACCESS_CODE') {
        // 잘못된 접근 코드
        await signOut({ redirect: false })
        setShowAccessCodeField(true)
        setError('유효하지 않은 접근 코드입니다.')
        return
      } else if (sessionError === 'PENDING_APPROVAL') {
        // 승인 대기 중
        await signOut({ redirect: false })
        setError('승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다.')
        return
      }

      // 실제 로그인 성공
      router.push(callbackUrl)
      router.refresh()
    } catch (err) {
      setError('요청 처리 중 오류가 발생했습니다')
      console.error('[Login Form Error]:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 이메일 */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
          이메일
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="example@example.com"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
          disabled={loading}
        />
        {fieldErrors.email && (
          <p className="text-red-400 text-sm mt-1">{fieldErrors.email[0]}</p>
        )}
      </div>

      {/* 비밀번호 */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
          비밀번호
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="비밀번호를 입력하세요"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all pr-12"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-3.5 text-white/50 hover:text-white/70 transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {fieldErrors.password && (
          <p className="text-red-400 text-sm mt-1">{fieldErrors.password[0]}</p>
        )}
      </div>

      {/* Remember me */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.rememberMe}
          onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
          className="w-4 h-4 bg-white/10 border border-white/30 rounded accent-pink-500 cursor-pointer"
          disabled={loading}
        />
        <span className="text-sm text-white/70">로그인 상태 유지</span>
      </label>

      {/* 초대 코드 토글 버튼 */}
      <button
        type="button"
        onClick={() => setShowAccessCodeField(!showAccessCodeField)}
        disabled={loading}
        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
      >
        {showAccessCodeField ? '✓ 초대 코드 입력' : '+ 초대 코드 입력'}
      </button>

      {/* 접근 코드 - 필요할 때만 표시 */}
      {showAccessCodeField && (
        <div>
          <label htmlFor="accessCode" className="block text-sm font-medium text-white/90 mb-2">
            초대 코드
          </label>
          <input
            id="accessCode"
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
            placeholder="DONBOK 또는 FORMAN"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
            disabled={loading}
          />
          <p className="text-white/50 text-xs mt-1">
            💡 DONBOK (90일 프리미엄) 또는 FORMAN (30일 스탠다드)
          </p>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex gap-2">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 로그인 버튼 */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-cyan-400 text-black rounded-lg hover:shadow-[0_0_20px_rgba(254,44,85,0.5)] transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
      >
        {loading && <Loader2 size={20} className="animate-spin" />}
        로그인
      </button>

      {/* 비밀번호 찾기 */}
      <div className="text-center pt-2">
        <a href="#" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
          비밀번호 찾기
        </a>
      </div>
    </form>
  )
}
