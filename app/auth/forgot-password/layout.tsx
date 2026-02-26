import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '비밀번호 찾기 | 틱톡킬라',
  description: '비밀번호 재설정',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
