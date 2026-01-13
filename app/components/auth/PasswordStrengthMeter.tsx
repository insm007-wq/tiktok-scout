'use client'

import { getPasswordStrength } from '@/lib/validations/auth'
import { useMemo } from 'react'

interface PasswordStrengthMeterProps {
  password: string
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => {
    return getPasswordStrength(password)
  }, [password])

  const strengthColors = {
    weak: 'bg-red-500',
    fair: 'bg-yellow-500',
    good: 'bg-blue-500',
    strong: 'bg-green-500',
  }

  const strengthLabels = {
    weak: '약함',
    fair: '중간',
    good: '보통',
    strong: '강함',
  }

  return (
    <div className="space-y-2">
      {/* 강도 바 */}
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strengthColors[strength.level]}`}
          style={{ width: `${(strength.score / 7) * 100}%` }}
        />
      </div>

      {/* 강도 레이블 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">비밀번호 강도</span>
        <span className={`font-semibold ${strengthColors[strength.level].replace('bg-', 'text-')}`}>
          {strengthLabels[strength.level]}
        </span>
      </div>

      {/* 피드백 */}
      {strength.feedback.length > 0 && (
        <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg p-3 text-sm text-cyan-200">
          <p className="font-semibold mb-1">다음을 추가하세요:</p>
          <ul className="list-disc list-inside space-y-1">
            {strength.feedback.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 충족 조건 */}
      <div className="text-xs text-white/70 space-y-1">
        <div className={`flex items-center gap-2 ${password.length >= 8 ? 'text-green-400' : ''}`}>
          <span>{password.length >= 8 ? '✓' : '○'}</span>
          <span>8자 이상</span>
        </div>
        <div className={`flex items-center gap-2 ${/[a-z]/.test(password) ? 'text-green-400' : ''}`}>
          <span>{/[a-z]/.test(password) ? '✓' : '○'}</span>
          <span>소문자 포함</span>
        </div>
        <div className={`flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-green-400' : ''}`}>
          <span>{/[0-9]/.test(password) ? '✓' : '○'}</span>
          <span>숫자 포함</span>
        </div>
        <div className={`flex items-center gap-2 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-400' : ''}`}>
          <span>{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✓' : '○'}</span>
          <span>특수문자 포함</span>
        </div>
      </div>
    </div>
  )
}
