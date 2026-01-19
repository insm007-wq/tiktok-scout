'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // URL의 error 파라미터 확인 (페이지 로드 시)
  useEffect(() => {
    const errorParam = searchParams?.get('error')
    if (errorParam) {
      if (errorParam === 'CredentialsSignin') {
        setError('아이디 또는 비밀번호를 확인해주세요.')
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
      // NextAuth signIn 호출
      const response = await signIn('credentials', {
        email: result.data.email,
        password: result.data.password,
        redirect: false,
      })

      if (response?.error) {
        // 에러 코드에 따라 메시지 분리
        if (response?.error === 'PENDING_APPROVAL') {
          setError('승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다.')
        } else if (response?.error === 'SMS_NOT_VERIFIED') {
          setError('SMS 인증을 완료해주세요.')
        } else if (response?.error === 'ACCOUNT_BANNED') {
          setError('차단된 계정입니다. 관리자에게 문의하세요.')
        } else if (response?.error === 'ACCOUNT_DISABLED') {
          setError('비활성화된 계정입니다.')
        } else if (response?.error === 'INVALID_CREDENTIALS' || response?.error === 'CredentialsSignin') {
          setError('아이디 또는 비밀번호를 확인해주세요.')
        } else {
          setError(`로그인 실패: ${response?.error || '알 수 없는 오류'}`)
        }
        return
      }

      // 로그인 성공
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
