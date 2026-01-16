import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '영상 검색 | TikTalk Killa',
  description: 'TikTok, Douyin, 샤오홍슈의 인기 있는 영상을 검색하세요.',
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
