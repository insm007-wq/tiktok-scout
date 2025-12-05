'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import './login.css'

export default function Login() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (provider: string) => {
    try {
      setLoading(provider)
      setError(null)
      await signIn(provider, { redirectTo: '/dashboard' })
    } catch (err) {
      setError(`${provider} 로그인에 실패했습니다`)
      setLoading(null)
    }
  }

  return (
    <div className="login-container">
      <div className="login-content">
        {/* Back Link */}
        <Link href="/" className="back-link">
          <ArrowLeft size={18} strokeWidth={2} />
          <span>뒤로가기</span>
        </Link>

        {/* Login Card */}
        <div className="login-card">
          <h1 className="login-title">로그인</h1>
          <p className="login-subtitle">YouTube Scout에 로그인</p>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* Login Buttons */}
          <div className="login-buttons">
            {/* Google Login */}
            <button
              onClick={() => handleLogin('google')}
              disabled={loading !== null}
              className="login-btn login-btn-google"
              style={{ opacity: loading !== null && loading !== 'google' ? 0.5 : 1 }}
            >
              <svg className="login-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="login-btn-text">
                {loading === 'google' ? '로그인 중...' : 'Google로 로그인'}
              </span>
            </button>

            {/* Kakao Login */}
            <button
              onClick={() => handleLogin('kakao')}
              disabled={loading !== null}
              className="login-btn login-btn-kakao"
              style={{ opacity: loading !== null && loading !== 'kakao' ? 0.5 : 1 }}
            >
              <svg className="login-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.58 2 10c0 2.62 1.35 4.95 3.42 6.5-.26 2.11-1.32 4.5-1.32 4.5s3.74-.63 5.26-1.58c.8.1 1.62.16 2.64.16 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
              </svg>
              <span className="login-btn-text">
                {loading === 'kakao' ? '로그인 중...' : '카카오로 로그인'}
              </span>
            </button>

            {/* Naver Login */}
            <button
              onClick={() => handleLogin('naver')}
              disabled={loading !== null}
              className="login-btn login-btn-naver"
              style={{ opacity: loading !== null && loading !== 'naver' ? 0.5 : 1 }}
            >
              <span className="login-btn-text-bold">N</span>
              <span className="login-btn-text">
                {loading === 'naver' ? '로그인 중...' : '네이버로 로그인'}
              </span>
            </button>
          </div>

          {/* Terms Agreement */}
          <div className="login-terms">
            <p className="login-terms-text">
              로그인을 진행하면
              <Link href="/terms" className="login-terms-link">이용약관</Link> 및
              <Link href="/privacy" className="login-terms-link">개인정보처리방침</Link>에
              동의하는 것으로 간주됩니다
            </p>
          </div>

          {/* Info */}
          <div className="login-info">
            <p className="login-info-text">첫 로그인 시 계정이 자동으로 생성됩니다</p>
          </div>
        </div>
      </div>

      {/* 배경 요소 */}
      <div className="bg-circle bg-circle-blue"></div>
      <div className="bg-circle bg-circle-red"></div>
    </div>
  )
}
