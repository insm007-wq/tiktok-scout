import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '로그인 | 틱톡킬라',
  description: '틱톡킬라 계정으로 로그인하세요',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://www.tiktalk-killa.com/auth/login',
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
