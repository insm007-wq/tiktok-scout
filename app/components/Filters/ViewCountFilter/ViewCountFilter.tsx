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

  // 빠른 선택 버튼 클릭
  const handleQuickSelect = (min: number, max: number | null) => {
    onChange(min, max)
  }

  // 현재 선택된 빠른 옵션 찾기
  const selectedQuick = QUICK_OPTIONS.find(
    (opt) => opt.min === minValue && opt.max === maxValue
  )

  return (
    <div className="filter-section">
      {/* 빠른 선택 버튼 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "0px" }}>
        {QUICK_OPTIONS.map((option) => (
          <button
            key={option.label}
            onClick={() => handleQuickSelect(option.min, option.max)}
            style={{
              padding: "6px 8px",
              borderRadius: "6px",
              border: selectedQuick?.label === option.label ? "2px solid #000000" : "1px solid #d1d5db",
              backgroundColor: selectedQuick?.label === option.label ? "rgba(0, 0, 0, 0.05)" : "#fff",
              color: selectedQuick?.label === option.label ? "#000000" : "#6b6b6b",
              fontSize: "12px",
              fontWeight: selectedQuick?.label === option.label ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (selectedQuick?.label !== option.label) {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
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


      <style jsx>{``}</style>
    </div>
  )
}
