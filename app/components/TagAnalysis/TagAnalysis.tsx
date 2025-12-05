'use client'

interface TagAnalysisProps {
  tags?: string[]
  title: string
}

export default function TagAnalysis({ tags = [], title }: TagAnalysisProps) {
  // 제목에서 태그 추출 (한글/영문 키워드)
  const extractTagsFromTitle = (text: string): string[] => {
    const words = text.split(/[\s\-\(\)\[\]#]+/).filter(word => {
      // 2글자 이상, 숫자 제외
      return word.length >= 2 && !/^\d+$/.test(word)
    })

    // 중복 제거, 소문자로 통일
    return Array.from(new Set(words.map(w => w.toLowerCase())))
      .slice(0, 5) // 상위 5개만
  }

  // YouTube API 태그와 제목에서 추출한 태그 합치기
  const allTags = [
    ...(tags || []),
    ...extractTagsFromTitle(title),
  ]

  // 중복 제거
  const uniqueTags = Array.from(new Set(allTags))
    .slice(0, 8) // 최대 8개

  if (uniqueTags.length === 0) {
    return (
      <div className="video-tags">
        <span style={{ fontSize: '11px', color: '#999' }}>태그 없음</span>
      </div>
    )
  }

  return (
    <div className="video-tags">
      {uniqueTags.map((tag) => (
        <span key={tag} className="tag">
          #{tag}
        </span>
      ))}
    </div>
  )
}
