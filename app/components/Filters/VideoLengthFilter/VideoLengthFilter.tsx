'use client'

interface VideoLengthFilterProps {
  value: string
  onChange: (value: string) => void
}

export default function VideoLengthFilter({ value, onChange }: VideoLengthFilterProps) {
  return (
    <div className="filter-section">
      <div className="filter-title">길이</div>
      <div className="filter-options">
        <label className="filter-option">
          <input
            type="radio"
            name="videoLength"
            value="all"
            checked={value === 'all'}
            onChange={(e) => onChange(e.target.value)}
          />
          <label>전체</label>
        </label>
        <label className="filter-option">
          <input
            type="radio"
            name="videoLength"
            value="short"
            checked={value === 'short'}
            onChange={(e) => onChange(e.target.value)}
          />
          <label>20초 미만</label>
        </label>
        <label className="filter-option">
          <input
            type="radio"
            name="videoLength"
            value="long"
            checked={value === 'long'}
            onChange={(e) => onChange(e.target.value)}
          />
          <label>20초 이상</label>
        </label>
      </div>
    </div>
  )
}
