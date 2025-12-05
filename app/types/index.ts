/**
 * YouTube Video Type
 */
export interface YouTubeVideo {
  id: string
  title: string
  description: string
  channelTitle: string
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  subscriberCount?: number
  duration?: string
  categoryId?: string
  categoryName?: string
  categoryIcon?: string
}

/**
 * Search Filter Type
 */
export interface SearchFilter {
  uploadPeriod: 'all' | '1month' | '2months' | '6months' | '1year'
  videoLength: 'all' | 'short' | 'long'
  engagementRatio: string[]
}

/**
 * API Response Type
 */
export interface SearchResponse {
  videos: YouTubeVideo[]
  totalCount: number
  statistics?: {
    totalViews: number
    averageSubscribers: number
    averageRatio: number
  }
}
