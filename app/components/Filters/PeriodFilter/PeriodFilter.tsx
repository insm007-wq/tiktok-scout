'use client'

import { useState } from 'react'

interface PeriodFilterProps {
  value: string
  onChange: (value: string) => void
}

// 단기 옵션
const SHORT_TERM_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: '3days', label: '3일' },
  { value: '5days', label: '5일' },
  { value: '7days', label: '7일' },
  { value: '10days', label: '10일' },
]

// 중장기 옵션
const LONG_TERM_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: '1month', label: '1개월' },
  { value: '2months', label: '2개월' },
  { value: '6months', label: '6개월' },
  { value: '1year', label: '1년' },
]

export default function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  // 초기값 결정 (기본값은 "long" 타입)
  const [periodType, setPeriodType] = useState<'short' | 'long'>(() => {
    if (['3days', '5days', '7days', '10days'].includes(value)) {
      return 'short'
    }
    return 'long'
  })

  const options = periodType === 'short' ? SHORT_TERM_OPTIONS : LONG_TERM_OPTIONS

  const handleTypeChange = (newType: 'short' | 'long') => {
    setPeriodType(newType)
    // 타입 변경 시 새로운 타입의 첫 번째 옵션(전체)으로 초기화
    onChange('all')
  }

  return (
    <div className="filter-section">
      <div className="filter-title">업로드 기간</div>

      {/* 단기/장기 라디오 버튼 */}
      <div className="period-type-selector">
        <label className="period-type-option">
          <input
            type="radio"
            name="periodType"
            checked={periodType === 'short'}
            onChange={() => handleTypeChange('short')}
          />
          <span>단기</span>
        </label>
        <label className="period-type-option">
          <input
            type="radio"
            name="periodType"
            checked={periodType === 'long'}
            onChange={() => handleTypeChange('long')}
          />
          <span>중·장기</span>
        </label>
      </div>

      {/* 기간 옵션 (Pill 버튼) */}
      <div className="filter-options">
        {options.map((option) => (
          <label key={option.value} className="filter-option">
            <input
              type="radio"
              name="uploadPeriod"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
