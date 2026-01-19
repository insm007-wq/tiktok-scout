export const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'TikTalk Killa',
  alternateName: '틱톡킬라',
  url: 'https://www.tiktalk-killa.com',
  applicationCategory: 'SearchApplication',
  description: '틱톡킬라(TikTalk Killa)는 TikTok, Douyin, 샤오홍슈 영상을 한눈에 검색하고 분석하는 도구입니다. 틱톡 킬라로 인기 콘텐츠를 발견하세요.',
  softwareVersion: '1.0.0',
  author: {
    '@type': 'Organization',
    name: 'TikTalk Killa Team',
    url: 'https://www.tiktalk-killa.com',
  },
  offers: {
    '@type': 'Offer',
    priceCurrency: 'USD',
    price: '0',
    description: 'Free video search and analytics service',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.tiktalk-killa.com/search?q={search_term_string}',
    },
    query_input: 'required name=search_term_string',
  },
}

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'TikTalk Killa',
  alternateName: '틱톡킬라',
  url: 'https://www.tiktalk-killa.com',
  logo: 'https://www.tiktalk-killa.com/logo.png',
  description:
    '틱톡킬라(TikTalk Killa)는 TikTok, Douyin, 샤오홍슈 영상을 한눈에 검색하고 분석합니다. 틱톡 킬라로 인기 콘텐츠와 크리에이터를 발견하세요.',
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    url: 'https://www.tiktalk-killa.com',
  },
}

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'TikTalk Killa',
  alternateName: '틱톡킬라',
  url: 'https://www.tiktalk-killa.com',
  description:
    '틱톡킬라(TikTalk Killa)는 TikTok, Douyin, 샤오홍슈 영상을 한눈에 검색하고 분석합니다.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate:
        'https://www.tiktalk-killa.com/search?q={search_term_string}',
    },
    queryInput: 'required name=search_term_string',
  },
}
