'use client'

type Platform = 'tiktok' | 'douyin' | 'xiaohongshu'

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

    case 'xiaohongshu':
      // Xiaohongshu: All time, Last day, Last week, Last 6 months
      return [
        { value: 'all', label: '전체' },
        { value: 'yesterday', label: '어제' },
        { value: '7days', label: '1주일' },
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
            backgroundColor: value === option.value ? "rgba(0, 0, 0, 0.05)" : "transparent",
            border: value === option.value ? "1px solid rgba(0, 0, 0, 0.12)" : "1px solid transparent",
            transition: "all 0.2s",
            fontSize: "13px",
            fontWeight: value === option.value ? "600" : "500",
            color: value === option.value ? "#000000" : "#6b6b6b",
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
            border: value === option.value ? "3px solid #000000" : "2px solid #d1d5db",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "8px",
            backgroundColor: value === option.value ? "#000000" : "transparent",
          }}>
            {value === option.value && <span style={{ width: "4px", height: "4px", backgroundColor: "white", borderRadius: "50%" }} />}
          </span>
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
