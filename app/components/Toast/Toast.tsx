'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react'
import './Toast.css'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface ToastProps {
  toasts: Toast[]
  onRemove: (id: string) => void
  position?: 'top-center' | 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
}

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return <CheckCircle size={20} />
    case 'error':
    case 'warning':
      return <AlertTriangle size={20} />
    case 'info':
      return <Info size={20} />
    default:
      return <AlertTriangle size={20} />
  }
}

const getIconColor = (type: ToastType): string => {
  switch (type) {
    case 'error':
      return '#ff4444'
    case 'warning':
      return '#ff9800'
    case 'success':
      return '#00e676'
    case 'info':
      return '#40c4ff'
    default:
      return 'rgba(255, 255, 255, 0.9)'
  }
}

export default function Toast({ toasts, onRemove, position = 'top-center' }: ToastProps) {
  return (
    <div className={`toast-container ${position}`}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className="toast-wrapper"
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div
              className={`toast-content toast-content--${toast.type}`}
            >
              <div className="toast-body">
                <div className="toast-icon" style={{ color: getIconColor(toast.type) }}>
                  {getIcon(toast.type)}
                </div>
                <div className="toast-message-wrapper">
                  {toast.title && (
                    <div className="toast-title">{toast.title}</div>
                  )}
                  <div className="toast-message">{toast.message}</div>
                </div>
              </div>
              <button
                className="toast-close"
                onClick={() => onRemove(toast.id)}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
