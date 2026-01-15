'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone')

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // 핸드폰이 없으면 회원가입 페이지로 리다이렉트
  useEffect(() => {
    if (!phone) {
      router.push('/auth/signup')
    }
  }, [phone, router])

  // 재발송 쿨다운
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // 인증 코드 검증
  const handleVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setLoading(true)

      try {
        if (!phone) {
          throw new Error('핸드폰 번호 정보가 없습니다')
        }

        if (!code || code.length !== 6) {
          throw new Error('6자리 인증 코드를 입력해주세요')
        }

        // SMS 검증 API 호출
        const response = await fetch('/api/auth/sms/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '인증에 실패했습니다')
        }

        setSuccess(true)
        setCode('')

        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    },
    [phone, code, router]
  )

  // 인증 코드 재발송
  const handleResend = useCallback(async () => {
    setError('')
    setLoading(true)
    setResendCooldown(60)

    try {
      if (!phone) {
        throw new Error('핸드폰 번호 정보가 없습니다')
      }

      // SMS 발송 API 호출
      const response = await fetch('/api/auth/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '재발송에 실패했습니다')
      }

      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다')
      setResendCooldown(0)
    } finally {
      setLoading(false)
    }
  }, [phone])

  if (!phone) {
    return null
  }

  // 성공 화면
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle2 size={40} className="text-green-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">인증 완료!</h1>
            <p className="text-gray-600 mb-4">
              SMS 인증이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-green-800">
                <span className="font-semibold">({phone})</span>로 인증 완료되었습니다.
              </p>
            </div>

            <p className="text-gray-500 text-sm mb-4">로그인 페이지로 이동 중...</p>

            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              로그인 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 인증 입력 화면
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS 인증</h1>
          <p className="text-gray-600">인증 코드를 입력해주세요</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {/* 핸드폰 정보 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">{phone}</span>으로 인증 코드를 발송했습니다. (유효시간: 5분)
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* 인증 코드 입력 폼 */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                인증 코드 (6자리)
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-2xl tracking-widest px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                disabled={loading}
              />
            </div>

            {/* 재발송 버튼 */}
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
              className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              {resendCooldown > 0 ? `${resendCooldown}초 후 재발송` : '코드 재발송'}
            </button>

            {/* 인증 버튼 */}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={20} className="animate-spin" />}
              인증 완료
            </button>
          </form>

          {/* 도움말 */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p className="mb-3">코드를 받지 못했나요?</p>
            <ul className="text-left space-y-1 text-gray-500">
              <li>• 핸드폰 설정에서 SMS 수신을 확인해주세요</li>
              <li>• 스팸 폴더를 확인해주세요</li>
              <li>• 핸드폰 번호를 다시 확인해주세요</li>
            </ul>
          </div>
        </div>

        {/* 뒤로가기 링크 */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/auth/signup')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← 회원가입으로 돌아가기
          </button>
        </div>

        {/* 메인으로 버튼 */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-lg transition-all"
          >
            ← 메인으로
          </Link>
        </div>
      </div>
    </div>
  )
}
