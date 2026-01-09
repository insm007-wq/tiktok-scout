'use client'

import './Spinner.css'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  text?: string
  className?: string
  fullscreen?: boolean
}

export default function Spinner({
  size = 'md',
  color = '#000000',
  text,
  className = '',
  fullscreen = false
}: SpinnerProps) {
  const sizeMap = {
    sm: '32px',
    md: '48px',
    lg: '64px'
  }

  return (
    <div
      className={`spinner-container ${fullscreen ? 'spinner-fullscreen' : ''} ${className}`}
      role="status"
      aria-label={text || '로딩 중'}
    >
      <div
        className="spinner-ring"
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          borderColor: `transparent transparent ${color} ${color}`,
          '--spinner-color': color
        } as React.CSSProperties & { '--spinner-color': string }}
      />
      {text && (
        <p className="spinner-text" style={{ color: '#999' }}>
          {text}
        </p>
      )}
    </div>
  )
}
