import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보 처리방침 | 틱톡킬라',
  description: '틱톡킬라의 개인정보 처리방침을 확인하세요',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.tiktalk-killa.com/privacy',
  },
}

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
