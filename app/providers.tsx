'use client'

import { SessionProvider } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import React from 'react'
import DarkFooter from './components/DarkFooter'
import DashboardFooter from './components/DashboardFooter'

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard')

  return (
    <SessionProvider>
      <div className="flex flex-col min-h-screen bg-white">
        <main>
          {children}
        </main>
        {isDashboard ? <DashboardFooter /> : <DarkFooter />}
      </div>
    </SessionProvider>
  )
}
