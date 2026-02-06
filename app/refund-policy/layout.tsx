import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '환불정책 | 틱톡킬라',
  description: '틱톡킬라의 환불정책을 확인하세요',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.tiktalk-killa.com/refund-policy',
  },
}

export default function RefundPolicyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
