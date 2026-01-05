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
      <div className="engagement-title">종합 인기도 (다중선택)</div>
      <div className="engagement-subtitle">
        (좋아요 + 댓글 + 공유) ÷ 조회수 기반 인기도 단계
      </div>
      <div className="engagement-options">
        <label className="filter-option">
          <input
            type="checkbox"
            name="engagementRatio"
            value="all"
            checked={selectedValues.includes('all')}
            onChange={() => handleChange('all')}
          />
          <label>전체</label>
        </label>
        <label className="filter-option">
          <input
            type="checkbox"
            name="engagementRatio"
            value="1"
            checked={selectedValues.includes('1')}
            onChange={() => handleChange('1')}
          />
          <label>1단계 - 낮음 (&lt;5%)</label>
        </label>
        <label className="filter-option">
          <input
            type="checkbox"
            name="engagementRatio"
            value="2"
            checked={selectedValues.includes('2')}
            onChange={() => handleChange('2')}
          />
          <label>2단계 - 중간 (5~15%)</label>
        </label>
        <label className="filter-option">
          <input
            type="checkbox"
            name="engagementRatio"
            value="3"
            checked={selectedValues.includes('3')}
            onChange={() => handleChange('3')}
          />
          <label>3단계 - 좋음 (15~30%)</label>
        </label>
        <label className="filter-option">
          <input
            type="checkbox"
            name="engagementRatio"
            value="4"
            checked={selectedValues.includes('4')}
            onChange={() => handleChange('4')}
          />
          <label>4단계 - 매우좋음 (30~50%)</label>
        </label>
        <label className="filter-option">
          <input
            type="checkbox"
            name="engagementRatio"
            value="5"
            checked={selectedValues.includes('5')}
            onChange={() => handleChange('5')}
          />
          <label>5단계 - 최고 (≥50%)</label>
        </label>
      </div>

      <style jsx>{`
        .engagement-subtitle {
          font-size: 12px;
          color: var(--text-secondary, #666);
          margin-top: 4px;
          margin-bottom: 12px;
          font-weight: 400;
        }
      `}</style>
    </div>
  )
}
