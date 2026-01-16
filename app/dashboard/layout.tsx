import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '대시보드 | TikTalk Killa',
  description: 'TikTok, Douyin, 샤오홍슈 영상을 검색하고 분석하는 대시보드입니다.',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
