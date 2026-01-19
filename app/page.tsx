import type { Metadata } from 'next'
import HomeContent from './home-content'

export const metadata: Metadata = {
  title: 'TikTalk Killa | 틱톡 영상 검색 및 분석 도구',
  description: 'TikTok, Douyin, 샤오홍슈 영상을 한눈에 검색하고 분석하세요. 가장 인기 있는 콘텐츠를 발견하세요.',
  keywords: ['TikTok', '검색', '분석', 'Douyin', '샤오홍슈', '영상', 'TikTalk'],
  authors: [{ name: 'TikTalk Killa Team' }],
  creator: 'TikTalk Killa',
  publisher: 'TikTalk Killa',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://www.tiktalk-killa.com',
    siteName: 'TikTalk Killa',
    title: 'TikTalk Killa | 틱톡 영상 검색 및 분석 도구',
    description: 'TikTok, Douyin, 샤오홍슈 영상을 한눈에 검색하고 분석하세요.',
    images: [
      {
        url: 'https://www.tiktalk-killa.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TikTalk Killa',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TikTalk Killa | 틱톡 영상 검색 및 분석 도구',
    description: 'TikTok, Douyin, 샤오홍슈 영상을 한눈에 검색하고 분석하세요.',
    images: ['https://www.tiktalk-killa.com/twitter-image.png'],
  },
  alternates: {
    canonical: 'https://www.tiktalk-killa.com',
  },
  verification: {
    google: 'google-site-verification-code-here',
  },
}

export default function Home() {
  return <HomeContent />
}
