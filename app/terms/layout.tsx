import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '서비스 이용약관 | 틱톡킬라',
  description: '틱톡킬라의 서비스 이용약관을 확인하세요',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.tiktalk-killa.com/terms',
  },
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
