'use client'

import VideoCard from '@/app/components/VideoCard/VideoCard'
import ResultsTable from '@/app/components/ResultsTable/ResultsTable'
import TagAnalysisDashboard from '@/app/components/TagAnalysisDashboard/TagAnalysisDashboard'
import Spinner from '@/app/components/ui/Spinner'

interface SearchResultsProps {
  results: any[]
  totalResults: number
  isLoading: boolean
  showVPH?: boolean
  viewMode: 'card' | 'table'
  onChannelClick?: (channelId: string, channelTitle: string) => void
  onCommentsClick?: (videoId: string, videoTitle: string) => void
}

export default function SearchResults({
  results,
  totalResults,
  isLoading,
  showVPH = false,
  viewMode,
  onChannelClick,
  onCommentsClick,
}: SearchResultsProps) {

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* 태그 분석 대시보드 */}
      <TagAnalysisDashboard results={results} />

      {/* 결과 영역 */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: isLoading || results.length === 0 ? 'center' : 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto'
      }}>
        {isLoading ? (
          <Spinner text="검색 중..." />
        ) : results.length === 0 ? (
          <div className="no-results">
            <p>왼쪽 필터에서 검색을 진행해주세요</p>
          </div>
        ) : viewMode === 'card' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            width: '100%',
            padding: '20px',
            alignContent: 'flex-start',
          }}>
            {results.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                showVPH={showVPH}
                onChannelClick={onChannelClick}
                onCommentsClick={onCommentsClick}
              />
            ))}
          </div>
        ) : (
          <ResultsTable results={results} showVPH={showVPH} />
        )}
      </div>
    </div>
  )
}
