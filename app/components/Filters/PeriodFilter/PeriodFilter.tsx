'use client'

interface PeriodFilterProps {
  value: string
  onChange: (value: string) => void
}

// 기간 옵션
const PERIOD_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: '7days', label: '1주일' },
  { value: '1month', label: '1개월' },
  { value: '6months', label: '6개월' },
  { value: '1year', label: '1년' },
]

export default function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="filter-section">
      <div className="filter-title">기간</div>

      {/* 기간 옵션 (Pill 버튼) */}
      <div className="filter-options">
        {PERIOD_OPTIONS.map((option) => (
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
