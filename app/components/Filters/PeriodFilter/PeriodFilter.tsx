'use client'

type Platform = 'tiktok' | 'douyin' | 'youtube'

interface PeriodFilterProps {
  value: string
  onChange: (value: string) => void
  platform?: Platform
}

// 플랫폼별 기간 옵션
const getPeriodOptions = (platform?: Platform) => {
  switch (platform) {
    case 'douyin':
      // Douyin: all, last_day, last_week, last_half_year
      return [
        { value: 'all', label: '전체' },
        { value: 'yesterday', label: '어제' },
        { value: '7days', label: '1주일' },
        { value: '6months', label: '6개월' },
      ]

    case 'youtube':
      // YouTube: uploadDate (hour, today, week, month, year)
      return [
        { value: 'all', label: '전체' },
        { value: 'yesterday', label: '오늘' },
        { value: '7days', label: '1주일' },
        { value: '1month', label: '1개월' },
        { value: '6months', label: '6개월' },
      ]

    case 'tiktok':
    default:
      // TikTok: DEFAULT, YESTERDAY, THIS_WEEK, THIS_MONTH, LAST_THREE_MONTHS
      return [
        { value: 'all', label: '전체' },
        { value: 'yesterday', label: '어제' },
        { value: '7days', label: '1주일' },
        { value: '1month', label: '1개월' },
        { value: '3months', label: '3개월' },
      ]
  }
}

export default function PeriodFilter({ value, onChange, platform }: PeriodFilterProps) {
  const PERIOD_OPTIONS = getPeriodOptions(platform)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {PERIOD_OPTIONS.map((option) => (
        <label
          key={option.value}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "6px 8px",
            borderRadius: "6px",
            cursor: "pointer",
            backgroundColor: value === option.value ? "rgba(0, 229, 115, 0.15)" : "transparent",
            border: value === option.value ? "1px solid rgba(0, 229, 115, 0.3)" : "1px solid transparent",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            fontSize: "13px",
            fontWeight: value === option.value ? "600" : "500",
            color: value === option.value ? "#00E573" : "rgba(255, 255, 255, 0.5)",
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
            border: value === option.value ? "3px solid #00E573" : "2px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "8px",
            backgroundColor: value === option.value ? "#00E573" : "transparent",
          }}>
            {value === option.value && <span style={{ width: "4px", height: "4px", backgroundColor: "#000000", borderRadius: "50%" }} />}
          </span>
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
