import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '프로필 | 틱톡킬라',
  description: '사용자 프로필 정보를 관리하세요',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://www.tiktalk-killa.com/profile',
  },
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
