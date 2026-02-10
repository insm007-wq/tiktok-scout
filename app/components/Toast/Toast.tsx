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
      return '#ff6b6b'
    case 'warning':
      return '#ffa500'
    case 'success':
      return '#00E573'
    case 'info':
      return '#9D4EDD'
    default:
      return 'rgba(255, 255, 255, 0.6)'
  }
}

const getBackgroundColor = (type: ToastType): string => {
  switch (type) {
    case 'error':
      return 'rgba(239, 68, 68, 0.15)'
    case 'warning':
      return 'rgba(245, 158, 11, 0.15)'
    case 'success':
      return 'rgba(0, 229, 115, 0.15)'
    case 'info':
      return 'rgba(157, 78, 221, 0.15)'
    default:
      return 'rgba(255, 255, 255, 0.08)'
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
              className="toast-content"
              style={{ backgroundColor: getBackgroundColor(toast.type) }}
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
