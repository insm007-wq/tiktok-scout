import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/*.json$',
        '/*?*sort=',
        '/*?*filter=',
      ],
    },
    sitemap: 'https://www.tiktalk-killa.com/sitemap.xml',
  }
}
