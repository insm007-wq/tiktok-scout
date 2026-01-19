import type { Metadata } from 'next'
import HomeContent from './home-content'

export const metadata: Metadata = {
  title: '틱톡킬라 | TikTalk Killa - 틱톡 영상 검색 및 분석 도구',
  description: '틱톡킬라는 TikTok, Douyin, 샤오홍슈 영상을 한눈에 검색하고 분석하는 도구입니다. 틱톡 킬라로 인기 콘텐츠를 발견하고 크리에이터를 분석하세요.',
  keywords: ['틱톡킬라', '틱톡 킬라', 'TikTalk Killa', 'TikTok 검색', '틱톡 검색', '틱톡 분석', 'Douyin', '샤오홍슈', '숏폼', '영상 검색', '크리에이터 검색'],
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
    siteName: '틱톡킬라 | TikTalk Killa',
    title: '틱톡킬라 - 틱톡 영상 검색 및 분석 도구',
    description: '틱톡킬라는 TikTok, Douyin, 샤오홍슈 영상을 한눈에 검색하고 분석합니다. 틱톡 킬라로 인기 콘텐츠를 발견하세요.',
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
    title: '틱톡킬라 - 틱톡 영상 검색 및 분석 도구',
    description: '틱톡킬라는 TikTok, Douyin, 샤오홍슈 영상을 한눈에 검색하고 분석합니다. 틱톡 킬라로 인기 콘텐츠를 발견하세요.',
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
