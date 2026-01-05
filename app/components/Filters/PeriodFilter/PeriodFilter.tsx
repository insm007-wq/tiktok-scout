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
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {PERIOD_OPTIONS.map((option) => (
        <label
          key={option.value}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 10px",
            borderRadius: "6px",
            cursor: "pointer",
            backgroundColor: value === option.value ? "#e0e7ff" : "transparent",
            border: value === option.value ? "1px solid #4f46e5" : "1px solid transparent",
            transition: "all 0.2s",
            fontSize: "13px",
            fontWeight: value === option.value ? "600" : "500",
            color: value === option.value ? "#4f46e5" : "#666",
          }}
        >
          <input
            type="radio"
            name="uploadPeriod"
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            style={{ display: "none" }}
          />
          <span style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            border: value === option.value ? "3px solid #4f46e5" : "2px solid #d1d5db",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "8px",
            backgroundColor: value === option.value ? "#4f46e5" : "transparent",
          }}>
            {value === option.value && <span style={{ width: "4px", height: "4px", backgroundColor: "white", borderRadius: "50%" }} />}
          </span>
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
