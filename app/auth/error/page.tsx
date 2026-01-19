'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams?.get('error')

  const errorMessages: Record<string, { title: string; message: string }> = {
    pending_approval: {
      title: '승인 대기 중',
      message: '귀하의 계정은 현재 관리자 승인을 기다리고 있습니다. 승인되면 로그인할 수 있습니다.',
    },
    sms_not_verified: {
      title: 'SMS 인증 필요',
      message: 'SMS 인증을 완료해야 합니다. 회원가입 과정을 다시 진행해주세요.',
    },
    account_banned: {
      title: '계정 차단',
      message: '귀하의 계정이 차단되었습니다. 자세한 내용은 관리자에게 문의하세요.',
    },
    account_disabled: {
      title: '계정 비활성화',
      message: '귀하의 계정이 비활성화되었습니다. 관리자에게 문의하세요.',
    },
    default: {
      title: '오류 발생',
      message: '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.',
    },
  }

  const errorInfo = errorMessages[error || 'default'] || errorMessages.default

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* 에러 아이콘 */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 rounded-full p-3">
              <AlertCircle size={48} className="text-red-600" />
            </div>
          </div>

          {/* 에러 제목 */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{errorInfo.title}</h1>

          {/* 에러 메시지 */}
          <p className="text-gray-600 mb-6">{errorInfo.message}</p>

          {/* 에러별 추가 정보 */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            {error === 'pending_approval' && (
              <div className="text-sm text-blue-700">
                <p className="font-semibold mb-2">다음 절차를 확인해주세요:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>1. SMS 인증 완료 (회원가입 시 진행됨)</li>
                  <li>2. 관리자가 귀하의 계정을 검토</li>
                  <li>3. 승인 후 로그인 가능</li>
                </ul>
              </div>
            )}
            {error === 'sms_not_verified' && (
              <div className="text-sm text-blue-700">
                <p className="font-semibold mb-2">회원가입을 다시 진행해주세요:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>1. 회원가입 페이지에서 정보 입력</li>
                  <li>2. SMS 인증 코드 입력</li>
                  <li>3. 관리자 승인 대기</li>
                </ul>
              </div>
            )}
            {(error === 'account_banned' || error === 'account_disabled') && (
              <div className="text-sm text-blue-700">
                <p className="font-semibold mb-2">고객 지원팀에 연락해주세요:</p>
                <p>
                  이메일:{' '}
                  <a href="mailto:support@tiktokscout.com" className="text-blue-600 hover:underline">
                    support@tiktokscout.com
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* 버튼들 */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              로그인 페이지로
            </button>

            {error === 'sms_not_verified' && (
              <button
                onClick={() => router.push('/auth/signup')}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                회원가입 다시 하기
              </button>
            )}
          </div>
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

        {/* 푸터 */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>
            여전히 문제가 있으신가요?{' '}
            <a href="mailto:support@tiktokscout.com" className="text-blue-600 hover:text-blue-700">
              고객 지원 문의
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
