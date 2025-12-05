'use client'

interface ResultsTableProps {
  results: any[]
  showVPH: boolean
}

export default function ResultsTable({ results, showVPH }: ResultsTableProps) {
  // 숫자 포맷팅 함수
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // 오늘인지 확인
      if (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      ) {
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
      }

      // 어제인지 확인
      if (
        date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate()
      ) {
        return '어제'
      }

      // 같은 연도인지 확인
      if (date.getFullYear() === today.getFullYear()) {
        return `${date.getMonth() + 1}월 ${date.getDate()}일`
      }

      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
    } catch {
      return '-'
    }
  }

  // 길이 포맷팅 함수
  const formatDuration = (durationStr: string): string => {
    try {
      const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return '-'

      const hours = parseInt(match[1] || '0')
      const minutes = parseInt(match[2] || '0')
      const seconds = parseInt(match[3] || '0')

      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      } else {
        return `${minutes}:${String(seconds).padStart(2, '0')}`
      }
    } catch {
      return '-'
    }
  }

  // Engagement Level 계산
  const getEngagementLevel = (ratio: number): number => {
    if (ratio >= 3.0) return 5
    if (ratio >= 1.4) return 4
    if (ratio >= 0.6) return 3
    if (ratio >= 0.2) return 2
    return 1
  }

  // Engagement 배지 색상 (HTML과 동일)
  const getEngagementColor = (level: number): { bg: string; color: string } => {
    switch (level) {
      case 1:
        return { bg: '#ffe5e5', color: '#cc0000' }
      case 2:
        return { bg: '#ffe6cc', color: '#ff6600' }
      case 3:
        return { bg: '#ffffcc', color: '#ccaa00' }
      case 4:
        return { bg: '#ccffcc', color: '#00aa00' }
      case 5:
        return { bg: '#ccffee', color: '#009999' }
      default:
        return { bg: '#f0f0f0', color: '#999' }
    }
  }

  // VPH 계산 (조회수 / (구독자 * 일수))
  const calculateVPH = (
    viewCount: number,
    subscriberCount: number,
    publishedAt: string
  ): string => {
    if (subscriberCount === 0) return '-'

    try {
      const publishDate = new Date(publishedAt).getTime()
      const now = Date.now()
      const daysOld = Math.max(1, Math.floor((now - publishDate) / (1000 * 60 * 60 * 24)))

      const vph = viewCount / (subscriberCount * daysOld)
      return vph.toFixed(2)
    } catch {
      return '-'
    }
  }

  return (
    <div style={{ width: '100%', padding: '0 20px' }}>
      <div className="results-table-wrapper">
        <table className="results-table">
        <thead>
          <tr>
            <th>썸네일</th>
            <th>제목</th>
            <th>채널명</th>
            <th>조회수</th>
            <th>구독자</th>
            <th>비율</th>
            <th>단계</th>
            <th>길이</th>
            {showVPH && <th>VPH</th>}
            <th>업로드</th>
            <th>링크</th>
          </tr>
        </thead>
        <tbody>
          {results.map((video) => {
            const ratio = video.subscriberCount > 0 ? video.viewCount / video.subscriberCount : 0
            const level = getEngagementLevel(ratio)

            return (
              <tr key={video.id}>
                <td>
                  <img
                    src={video.thumbnail || '/placeholder.png'}
                    alt={video.title}
                    className="table-thumbnail"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement
                      img.src = '/placeholder.png'
                    }}
                  />
                </td>
                <td className="table-title" title={video.title}>
                  {video.title}
                </td>
                <td className="table-channel" title={video.channelTitle}>
                  {video.channelTitle}
                </td>
                <td className="table-number">{formatNumber(video.viewCount)}</td>
                <td className="table-number">{formatNumber(video.subscriberCount)}</td>
                <td className="table-number">{ratio.toFixed(2)}</td>
                <td>
                  <span className="engagement-badge" style={{
                    backgroundColor: getEngagementColor(level).bg,
                    color: getEngagementColor(level).color
                  }}>
                    {level}단계
                  </span>
                </td>
                <td className="table-duration">{formatDuration(video.duration)}</td>
                {showVPH && <td className="table-number">{calculateVPH(video.viewCount, video.subscriberCount, video.publishedAt)}</td>}
                <td className="table-date">{formatDate(video.publishedAt)}</td>
                <td>
                  <a
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="table-link"
                  >
                    보기
                  </a>
                </td>
              </tr>
            )
          })}
        </tbody>
        </table>
      </div>
    </div>
  )
}
