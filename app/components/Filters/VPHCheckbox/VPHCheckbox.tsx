'use client'

interface VPHCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function VPHCheckbox({ checked, onChange }: VPHCheckboxProps) {
  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <label className="filter-option">
        <input
          type="checkbox"
          id="showVPH"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label style={{ color: 'rgba(255, 255, 255, 0.75)' }}>VPH 표시</label>
      </label>
    </div>
  )
}
