'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!email.trim()) {
      setError('이메일을 입력해주세요.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('올바른 이메일 형식을 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-password-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '인증 코드 발송에 실패했습니다.')
        return
      }
      setSuccess(data.message || '인증 코드를 발송했습니다. 이메일을 확인해주세요.')
      setStep('reset')
    } catch {
      setError('요청 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!code.trim() || !newPassword.trim()) {
      setError('인증 코드와 새 비밀번호를 모두 입력해주세요.')
      return
    }
    if (newPassword.length < 8 || newPassword.length > 50) {
      setError('비밀번호는 8자 이상 50자 이하여야 합니다.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '비밀번호 재설정에 실패했습니다.')
        return
      }
      setSuccess(data.message || '비밀번호가 재설정되었습니다.')
      setTimeout(() => router.push('/auth/login'), 2000)
    } catch {
      setError('요청 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-gradient-to-br from-pink-500 to-transparent rounded-full blur-[100px] opacity-15 -top-64 -right-32 animate-pulse" />
        <div
          className="absolute w-[500px] h-[500px] bg-gradient-to-br from-cyan-400 to-transparent rounded-full blur-[100px] opacity-15 -bottom-32 -left-32 animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-pink-400 to-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(254,44,85,0.5)]">
            틱톡킬라
          </h1>
          <p className="text-white/70 text-lg">
            {step === 'email' ? '비밀번호를 찾을 이메일을 입력하세요' : '인증 코드와 새 비밀번호를 입력하세요'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@example.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex gap-2">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                  <p className="text-green-300 text-sm">{success}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-cyan-400 text-black rounded-lg hover:shadow-[0_0_20px_rgba(254,44,85,0.5)] font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={20} className="animate-spin" />}
                인증 코드 발송
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">이메일</label>
                <p className="px-4 py-2 bg-white/5 rounded-lg text-white/80 text-sm">{email}</p>
              </div>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-white/90 mb-2">
                  인증 코드
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6자리 코드"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-white/90 mb-2">
                  새 비밀번호
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8자 이상"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 pr-12"
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
              </div>
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex gap-2">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                  <p className="text-green-300 text-sm">{success}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-cyan-400 text-black rounded-lg hover:shadow-[0_0_20px_rgba(254,44,85,0.5)] font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={20} className="animate-spin" />}
                비밀번호 재설정
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setNewPassword('')
                  setError('')
                  setSuccess('')
                }}
                className="w-full text-sm text-white/60 hover:text-white/80"
              >
                다른 이메일로 다시 시도
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-pink-400 hover:text-pink-300 font-semibold text-sm">
              ← 로그인으로 돌아가기
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-semibold text-white bg-white/25 hover:bg-white/35 border border-white/50 hover:border-white/60 rounded-lg transition-all shadow-sm"
          >
            ← 메인으로
          </Link>
        </div>
      </div>
    </div>
  )
}
