'use client'

interface EngagementRatioFilterProps {
  selectedValues: string[]
  onChange: (values: string[]) => void
}

export default function EngagementRatioFilter({
  selectedValues,
  onChange,
}: EngagementRatioFilterProps) {
  const handleChange = (value: string) => {
    if (value === 'all') {
      // "전체" 클릭 시: 모든 단계 선택/해제
      if (selectedValues.includes('all')) {
        // "전체"가 이미 선택되었으면 해제
        onChange([])
      } else {
        // "전체"를 선택하면 모든 항목 선택
        onChange(['all'])
      }
    } else {
      // 특정 단계 선택 시: "전체" 제거하고 단계 토글
      let newValues = selectedValues.filter(v => v !== 'all')

      if (newValues.includes(value)) {
        // 이미 선택된 항목 해제
        newValues = newValues.filter(v => v !== value)
      } else {
        // 새로운 항목 선택
        newValues = [...newValues, value]
      }

      onChange(newValues)
    }
  }

  return (
    <div className="engagement-section">
      <div className="engagement-subtitle">
        (좋아요 + 댓글 + 공유) ÷ 조회수 기반 인기도 단계
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {[
          { value: 'all', label: '전체' },
          { value: '1', label: '1단계 - 낮음 (<5%)' },
          { value: '2', label: '2단계 - 중간 (5~15%)' },
          { value: '3', label: '3단계 - 좋음 (15~30%)' },
          { value: '4', label: '4단계 - 매우좋음 (30~50%)' },
          { value: '5', label: '5단계 - 최고 (≥50%)' },
        ].map((option) => (
          <label
            key={option.value}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 8px",
              borderRadius: "6px",
              cursor: "pointer",
              backgroundColor: selectedValues.includes(option.value) ? "#e0e7ff" : "transparent",
              border: selectedValues.includes(option.value) ? "1px solid #4f46e5" : "1px solid transparent",
              transition: "all 0.2s",
              fontSize: "13px",
              fontWeight: selectedValues.includes(option.value) ? "600" : "500",
              color: selectedValues.includes(option.value) ? "#4f46e5" : "#666",
            }}
          >
            <input
              type="checkbox"
              name="engagementRatio"
              value={option.value}
              checked={selectedValues.includes(option.value)}
              onChange={() => handleChange(option.value)}
              style={{ display: "none" }}
            />
            <span style={{
              width: "16px",
              height: "16px",
              borderRadius: "4px",
              border: selectedValues.includes(option.value) ? "3px solid #4f46e5" : "2px solid #d1d5db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "8px",
              backgroundColor: selectedValues.includes(option.value) ? "#4f46e5" : "transparent",
            }}>
              {selectedValues.includes(option.value) && (
                <span style={{ width: "3px", height: "6px", backgroundColor: "white", transform: "rotate(45deg)" }} />
              )}
            </span>
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      <style jsx>{`
        .engagement-subtitle {
          font-size: 12px;
          color: var(--text-secondary, #666);
          margin-top: 0;
          margin-bottom: 8px;
          font-weight: 400;
        }
      `}</style>
    </div>
  )
}
