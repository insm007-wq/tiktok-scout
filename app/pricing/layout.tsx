import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '요금제 | 틱톡킬라',
  description: '틱톡킬라의 요금제를 확인하세요. 라이트, 프로, 프로+, 울트라 플랜을 제공합니다.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.tiktalk-killa.com/pricing',
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
