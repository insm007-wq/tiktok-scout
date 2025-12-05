'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Placement = 'top' | 'bottom' | 'left' | 'right';
type Variant = 'default' | 'glassmorphic' | 'solid';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: Placement;
  variant?: Variant;
  delay?: number;
  disabled?: boolean;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  default: `
    bg-gray-900/90 dark:bg-gray-800/90
    text-white text-xs
    border border-white/10
    shadow-lg
  `,
  glassmorphic: `
    bg-white/80 dark:bg-gray-900/80
    text-gray-900 dark:text-gray-100 text-xs font-medium
    border border-white/20 dark:border-white/10
    shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]
    backdrop-blur-xl backdrop-saturate-150
  `,
  solid: `
    bg-gray-900 dark:bg-gray-800
    text-white text-xs
    border-0
    shadow-2xl
  `
};

const placementClasses: Record<Placement, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2'
};

const arrowClasses: Record<Placement, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 -mt-[1px] border-r border-b rotate-45',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-[1px] border-l border-t rotate-45',
  left: 'left-full top-1/2 -translate-y-1/2 -ml-[1px] border-t border-r rotate-45',
  right: 'right-full top-1/2 -translate-y-1/2 -mr-[1px] border-b border-l rotate-45'
};

const motionVariants = {
  top: { opacity: 0, scale: 0.95, y: 4 },
  bottom: { opacity: 0, scale: 0.95, y: -4 },
  left: { opacity: 0, scale: 0.95, x: 4 },
  right: { opacity: 0, scale: 0.95, x: -4 }
};

export function Tooltip({
  content,
  children,
  placement = 'top',
  variant = 'glassmorphic',
  delay = 300,
  disabled = false,
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReduceMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const handleShow = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay, disabled]);

  const handleHide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ESC 키 지원
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleHide();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVisible, handleHide]);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={motionVariants[placement]}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={motionVariants[placement]}
            transition={
              shouldReduceMotion
                ? { duration: 0.01 }
                : {
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                    duration: 0.2
                  }
            }
            className={`
              absolute z-50 px-3 py-2 rounded-xl
              whitespace-nowrap
              pointer-events-none
              ${placementClasses[placement]}
              ${variantStyles[variant]}
              ${className}
            `}
            role="tooltip"
            aria-live="polite"
          >
            {content}

            {/* Arrow */}
            <div
              className={`
                absolute w-3 h-3
                ${arrowClasses[placement]}
                ${
                  variant === 'default'
                    ? 'bg-gray-900/90 dark:bg-gray-800/90 border-white/10'
                    : ''
                }
                ${
                  variant === 'glassmorphic'
                    ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-white/20 dark:border-white/10'
                    : ''
                }
                ${variant === 'solid' ? 'bg-gray-900 dark:bg-gray-800 border-0' : ''}
              `}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
