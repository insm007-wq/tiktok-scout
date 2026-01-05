'use client'

import { useState } from 'react'

interface ViewCountFilterProps {
  minValue: number
  maxValue: number | null
  onChange: (min: number, max: number | null) => void
}

// 빠른 선택 옵션
const QUICK_OPTIONS = [
  { label: '전체', min: 0, max: null },
  { label: '10만+', min: 100000, max: null },
  { label: '30만+', min: 300000, max: null },
  { label: '50만+', min: 500000, max: null },
  { label: '100만+', min: 1000000, max: null },
]

export default function ViewCountFilter({
  minValue,
  maxValue,
  onChange,
}: ViewCountFilterProps) {
  const [isCustom, setIsCustom] = useState(false)
  const [tempMin, setTempMin] = useState(minValue.toString())
  const [tempMax, setTempMax] = useState(maxValue?.toString() || '')

  // 빠른 선택 버튼 클릭
  const handleQuickSelect = (min: number, max: number | null) => {
    onChange(min, max)
    setIsCustom(false)
  }

  // 커스텀 입력 저장
  const handleCustomApply = () => {
    const min = tempMin ? parseInt(tempMin) : 0
    const max = tempMax ? parseInt(tempMax) : null

    // 유효성 검사
    if (min < 0) {
      alert('최소값은 0 이상이어야 합니다.')
      return
    }

    if (max !== null && min > max) {
      alert('최소값이 최대값보다 클 수 없습니다.')
      return
    }

    onChange(min, max)
  }

  // 현재 선택된 빠른 옵션 찾기
  const selectedQuick = QUICK_OPTIONS.find(
    (opt) => opt.min === minValue && opt.max === maxValue
  )

  return (
    <div className="filter-section">
      <div className="filter-title">조회수</div>

      {/* 빠른 선택 버튼 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "12px" }}>
        {QUICK_OPTIONS.map((option) => (
          <button
            key={option.label}
            onClick={() => handleQuickSelect(option.min, option.max)}
            style={{
              padding: "8px 10px",
              borderRadius: "6px",
              border: selectedQuick?.label === option.label ? "2px solid #4f46e5" : "1px solid #d1d5db",
              backgroundColor: selectedQuick?.label === option.label ? "#e0e7ff" : "#fff",
              color: selectedQuick?.label === option.label ? "#4f46e5" : "#666",
              fontSize: "12px",
              fontWeight: selectedQuick?.label === option.label ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (selectedQuick?.label !== option.label) {
                e.currentTarget.style.backgroundColor = "#f5f7fa";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedQuick?.label !== option.label) {
                e.currentTarget.style.backgroundColor = "#fff";
              }
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 커스텀 입력 토글 */}
      <div className="custom-filter-toggle">
        <button
          className="toggle-button"
          onClick={() => setIsCustom(!isCustom)}
        >
          {isCustom ? '▼ 커스텀' : '▶ 커스텀'}
        </button>
      </div>

      {/* 커스텀 입력 폼 */}
      {isCustom && (
        <div className="custom-filter-form">
          <div className="input-group">
            <label>최소 조회수</label>
            <input
              type="number"
              value={tempMin}
              onChange={(e) => setTempMin(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>

          <div className="input-group">
            <label>최대 조회수 (선택)</label>
            <input
              type="number"
              value={tempMax}
              onChange={(e) => setTempMax(e.target.value)}
              placeholder="무제한"
              min="0"
            />
          </div>

          <button className="apply-button" onClick={handleCustomApply}>
            적용
          </button>
        </div>
      )}

      <style jsx>{`
        .custom-filter-toggle {
          margin-top: 8px;
          padding: 0 4px;
        }

        .toggle-button {
          background: none;
          border: none;
          color: var(--text-secondary, #666);
          cursor: pointer;
          font-size: 14px;
          padding: 4px 8px;
          transition: color 0.2s;
        }

        .toggle-button:hover {
          color: var(--text-primary, #000);
        }

        .custom-filter-form {
          margin-top: 12px;
          padding: 12px;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .input-group label {
          font-size: 12px;
          color: var(--text-secondary, #666);
          font-weight: 500;
        }

        .input-group input {
          padding: 8px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 4px;
          font-size: 14px;
        }

        .input-group input:focus {
          outline: none;
          border-color: var(--primary-color, #000);
          box-shadow: 0 0 0 2px var(--primary-color-alpha, rgba(0, 0, 0, 0.1));
        }

        .apply-button {
          padding: 8px 12px;
          background: var(--primary-color, #000);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .apply-button:hover {
          background: var(--primary-color-hover, #333);
        }

        .apply-button:active {
          background: var(--primary-color-active, #111);
        }
      `}</style>
    </div>
  )
}
