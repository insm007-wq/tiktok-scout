'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function VerifyCompletePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get('token') ?? null

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('유효하지 않은 링크입니다.')
      return
    }

    const doLogin = async () => {
      const res = await signIn('email-verify', {
        token,
        redirect: false,
        callbackUrl: '/dashboard',
      })

      if (res?.ok && res?.url) {
        setStatus('success')
        window.location.href = res.url
        return
      }
      setStatus('error')
      setErrorMsg(res?.error || '로그인에 실패했습니다. 로그인 페이지에서 다시 시도해주세요.')
    }

    doLogin()
  }, [token])

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <p className="text-red-400 mb-6">{errorMsg}</p>
          <a
            href="/auth/login"
            className="inline-block px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            로그인 페이지로 이동
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-40 animate-pulse" />
            <CheckCircle size={80} className="text-green-400 relative" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 mb-3">
          인증되었습니다
        </h1>
        <p className="text-white/60 mb-8 flex items-center justify-center gap-2">
          <Loader2 size={20} className="animate-spin" />
          로그인 중입니다...
        </p>
      </div>
    </div>
  )
}
