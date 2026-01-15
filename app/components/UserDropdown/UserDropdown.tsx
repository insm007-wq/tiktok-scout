'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { User, LogOut, ChevronDown } from 'lucide-react'
import './UserDropdown.css'

export default function UserDropdown() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await signOut({
      redirect: true,
      callbackUrl: '/auth/login'
    })
  }

  if (!session) return null

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <button
        className="user-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <User size={16} />
        <span className="user-email">{session.user.email}</span>
        <ChevronDown size={14} className={isOpen ? 'rotate' : ''} />
      </button>

      {isOpen && (
        <div className="user-menu">
          <div className="user-info">
            <div className="info-row">
              <span className="label">이메일:</span>
              <span className="value">{session.user.email}</span>
            </div>
            {session.user.name && (
              <div className="info-row">
                <span className="label">이름:</span>
                <span className="value">{session.user.name}</span>
              </div>
            )}
            {session.user.phone && (
              <div className="info-row">
                <span className="label">핸드폰:</span>
                <span className="value">{session.user.phone}</span>
              </div>
            )}
          </div>

          <div className="menu-divider" />

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
