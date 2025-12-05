'use client'

import { useState } from 'react'
import './TagAnalysisDashboard.css'

interface TagData {
  tag: string
  count: number
  totalViews: number
  totalSubscribers: number
  ratioSum: number
  videoCount: number
}

interface TagAnalysisDashboardProps {
  results: any[]
}

export default function TagAnalysisDashboard({ results }: TagAnalysisDashboardProps) {
  const [expanded, setExpanded] = useState(false)

  if (results.length === 0) {
    return null
  }

  // 태그 데이터 집계
  const tagMap: Record<string, TagData> = {}

  results.forEach((video) => {
    const tags = video.tags || []
    const viewCount = video.viewCount || 0
    const subscriberCount = video.subscriberCount || 0
    const ratio = subscriberCount > 0 ? viewCount / subscriberCount : 0

    tags.forEach((tag: string) => {
      if (!tagMap[tag]) {
        tagMap[tag] = {
          tag,
          count: 0,
          totalViews: 0,
          totalSubscribers: 0,
          ratioSum: 0,
          videoCount: 0,
        }
      }
      tagMap[tag].count++
      tagMap[tag].totalViews += viewCount
      tagMap[tag].totalSubscribers += subscriberCount
      tagMap[tag].ratioSum += ratio
      tagMap[tag].videoCount++
    })
  })

  // 빈도순으로 정렬
  const sortedTags = Object.values(tagMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  if (sortedTags.length === 0) {
    return null
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return Math.round(num).toString()
  }

  return (
    <div className="tag-analysis-dashboard active">
      <div className="tag-analysis-title">
        📑 태그 분석 (총 {Object.keys(tagMap).length}개 고유 태그)
        <button
          className="tag-analysis-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '간단히 보기' : '상세 보기'}
        </button>
      </div>

      {/* 태그 클라우드 */}
      <div className="tag-cloud">
        {sortedTags.map((tagData) => (
          <div key={tagData.tag} className="tag-item">
            <span>{tagData.tag}</span>
            <span className="tag-frequency">{tagData.count}</span>
          </div>
        ))}
      </div>

      {/* 상세 테이블 */}
      <div className={`tag-stats-table-wrapper ${expanded ? 'active' : ''}`}>
        <table className="tag-stats-table">
          <thead>
            <tr>
              <th>태그</th>
              <th>빈도</th>
              <th>평균 조회수</th>
              <th>평균 구독자</th>
              <th>평균 비율</th>
            </tr>
          </thead>
          <tbody>
            {sortedTags.map((tagData) => (
              <tr key={tagData.tag}>
                <td>
                  <strong>{tagData.tag}</strong>
                </td>
                <td>{tagData.count}</td>
                <td>{formatNumber(Math.round(tagData.totalViews / tagData.count))}</td>
                <td>{formatNumber(Math.round(tagData.totalSubscribers / tagData.count))}</td>
                <td>
                  {tagData.videoCount > 0
                    ? (tagData.ratioSum / tagData.videoCount).toFixed(2)
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
